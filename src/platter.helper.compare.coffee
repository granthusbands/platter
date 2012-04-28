# Compare two arrays and produce a set of edits to turn the first into the second
# TODO: Probably use an LCS algorithm (a good one)

# You provide two arrays and a range for each.
# It calls addfn(i,o) and remfn(i) for additions and removals
# that turn array a into array b.
Platter.Transformer = (a, b, addfn, remfn, ai=0, bi=0, aj=a.length, bj=b.length) ->
	added = 0
	# Since the caller might be modifying their a, we'll take a copy.
	a = a.slice()
	# Skip the identical end bit
	# Only needs doing once, since we actually walk forwards.
	while ai<aj && bi<bj && a[aj-1]==b[bj-1]
		--aj
		--bj
	while true
		# Skip the identical start/next bit
		while ai<aj && bi<bj && a[ai]==b[bi]
			++ai
			++bi
		# If either range is empty, we're about done.
		if ai>=aj || bi>=bj
			break
		# Having eliminated the start and end where they are the same, we need to find the nearest point at which they're the same. It's O(N^2), though.
		maxdiff = bj-bi-1 + aj-ai-1
		matched = false
		for diff in [1..maxdiff] by 1
			for i in [0..diff] by 1
				ai2 = ai+i
				bi2 = bi+diff-i
				if ai2>aj || bi2>bj || a[ai2]!=b[bi2]
					continue
				matched = true
				for j in [ai...ai2] by 1
					remfn(added+ai)
				for j in [bi...bi2] by 1
					addfn(added+ai, b[j])
					++added
				added -= ai2-ai
				ai = ai2
				bi = bi2
				break
			# Coffeescript lacks a break-outer...
			if matched then break
		# Failed to find a match? We're about done.
		if !matched
			break
	# Whatever's left just needs adding/removing
	if ai<aj
		for i in [ai...aj] by 1
			remfn(added+ai)
	if bi<bj
		for i in [bi...bj] by 1
			addfn(added+ai, b[i])
			++added
	# Though we don't use it, this gives a correct final value for added
	added -= aj-ai
