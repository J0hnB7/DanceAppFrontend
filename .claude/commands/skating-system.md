---
name: skating-system
description: Complete Skating System algorithm (all 11 rules) for DanceApp. Use when implementing or debugging SkatingSystemAlgorithm, Result calculation, Score/Mark entities, or any final placement logic. Covers majority calculation, per-dance placement (Rules 5-8), final summary aggregation (Rule 9), and cross-dance tiebreaking (Rules 10-11).
---

# The Skating System — Complete Algorithm Reference

Source: "The Skating System" official document (11 rules + worked examples)

---

## Core Concepts

- **Majority** = `floor(judgeCount / 2) + 1`
  - 3 judges → majority = 2
  - 5 judges → majority = 3
  - 7 judges → majority = 4
- **Two phases:** per-dance placement (Rules 5–8), then aggregation (Rules 9–11)
- **Final max 8 couples** — more than 8 requires another preliminary round

---

## Rules 1–4: Judge Obligations

**Rule 1 — Preliminary rounds (callback marking):**
- Judges mark YES/NO — exactly as many couples as Chairman requests
- Couples with most callbacks advance
- If tie at cutoff: Chairman decides (not scrutineer)

**Rule 2 — Final round:**
- All couples must receive a placement from each judge
- Max 8 couples in final

**Rule 3 — Final placements:**
- 1st = best, 2nd = second best, etc.

**Rule 4 — No ties allowed by judges:**
- A judge CANNOT give same place to two couples
- Ties can still emerge mathematically from the algorithm — that is allowed

---

## Rules 5–8: Per-Dance Placement

These rules determine final placement for **one dance** (or a single-dance section).

### Rule 5 — Basic majority

For each position P (starting from 1):
1. Count how many judges gave this couple place ≤ P ("P and higher")
2. If count ≥ majority → couple earns place P
3. Repeat for P = 1, 2, 3, ... until all couples placed

```
majority = floor(judgeCount / 2) + 1

for place P = 1 to numCouples:
  for each unplaced couple:
    count = number of judges who gave couple a mark <= P
    if count >= majority:
      award place P to this couple
```

**Key insight:** The column you work with (P) may not equal the place being awarded — when multiple couples earn a majority in the same column, they get consecutive places.

### Rule 6 — Multiple couples have majority for same place

When 2+ couples reach majority in the same column:
- Award **higher place to the one with greater majority count**
- Example: couple A has 5 "3rd and higher", couple B has 4 → A gets 3rd, B gets 4th

### Rule 7 — Equal majority for same place (tiebreak by sum)

When 2+ couples have **equal majority count** in the same column:
1. **Sum** (don't just count) the place marks that contributed to the majority
2. Lower sum → better place
3. If still tied → move to next column (P+1) for **these tied couples only**
4. Apply Rule 6 logic in next column
5. Continue until last possible column (= numCouples)
6. If still tied after last column → **average the tied positions**
   - 2-way tie for 3rd+4th → each gets 3.5 (announced as "tied for 3rd")
   - 3-way tie for 3rd+4th+5th → each gets 4th

### Rule 8 — No couple has majority for place 1

Skip forward through columns until at least one couple achieves majority:
- No majority in column 1 → try column 2 → try column 3 → ...
- Once one or more couples achieve majority → apply Rule 6 / Rule 7 as needed
- Then continue normally for remaining couples

---

## Rule 9: Final Summary (Multi-Dance Aggregation)

After per-dance placements (Rules 5–8) are computed for each dance:

1. Build Final Summary table: `couple × dance → place`
2. Sum all dance places for each couple
3. Lowest total = 1st overall, next = 2nd, etc.
4. Ties in total → apply Rule 10 and Rule 11

```java
// Final Summary
Map<CoupleId, Integer> totals = new HashMap<>();
for (Dance dance : dances) {
    for (Couple couple : couples) {
        totals.merge(coupleId, dancePlace[dance][couple], Integer::sum);
    }
}
// Sort by total ascending
```

---

## Rule 10: Tiebreak in Final Summary

When 2+ couples have equal total in Rule 9, for each tied position:

1. Count how many **1st places** (dance wins) each tied couple has
   - More 1st places → better position
2. Still tied → count "2nd and higher" places for remaining tied couples
   - More places → better position; equal count → lower sum → better position
3. Still tied → count "3rd and higher" places, etc.
4. **STOP at same-or-higher level** — do NOT go to lower places to break tie
5. If truly unbreakable under Rule 10 → go to Rule 11

**Important:** Rule 10 places **one couple at a time**. After placing one couple, the others re-compete for next position.

**Fractions in Final Summary (e.g., 2.5 from Rule 7 ties):**
- When counting places: 2.5 counts as a "3rd and higher" (round up)
- When summing: use actual fractional value (2.5)

---

## Rule 11: Cross-Dance Tiebreak (Last Resort)

When Rule 10 fails to separate couples:

1. **Pool all marks** from all dances for the tied couples — treat as one big single dance
   - Example: 2 dances × 7 judges = 14 total marks
   - New majority = `floor(totalMarks / 2) + 1` = 8
2. Apply Rules 5–8 to this pooled mark set
3. Place **one couple at a time**; remaining revert to Rule 10, then back to Rule 11 if needed
4. If still tied after Rule 11 → **unbreakable tie** → Chairman decides
   - 1st place tie: dance-off
   - Other places: couples share the tied position

---

## Implementation in DanceApp

### Data structures

```java
// Input: judges × couples matrix per dance
Map<Dance, Map<AdjudicatorId, Map<CoupleId, Integer>>> scores;

// Output per dance
Map<Dance, Map<CoupleId, Double>> danceResults; // Double for fractional ties

// Final Summary
Map<CoupleId, Double> finalSummaryTotal;
Map<CoupleId, Double> finalPlacement;
```

### Algorithm skeleton (Java)

```java
public Map<CoupleId, Double> calculate(
    List<Couple> couples,
    List<Dance> dances,
    Map<Dance, Map<AdjudicatorId, Map<CoupleId, Integer>>> scores
) {
    int judgeCount = scores.values().iterator().next().size();
    int majority = judgeCount / 2 + 1;

    // Step 1: Per-dance placements (Rules 5-8)
    Map<Dance, Map<CoupleId, Double>> danceResults = new HashMap<>();
    for (Dance dance : dances) {
        danceResults.put(dance, calculateDancePlacement(
            couples, scores.get(dance), majority
        ));
    }

    // Step 2: Final Summary (Rule 9)
    Map<CoupleId, Double> totals = new HashMap<>();
    for (Couple c : couples) {
        double sum = dances.stream()
            .mapToDouble(d -> danceResults.get(d).get(c.getId()))
            .sum();
        totals.put(c.getId(), sum);
    }

    // Step 3: Sort + tiebreak (Rules 10-11)
    return applyRule10And11(couples, totals, danceResults, majority);
}
```

### Per-dance placement (Rules 5-8)

```java
Map<CoupleId, Double> calculateDancePlacement(
    List<Couple> couples,
    Map<AdjudicatorId, Map<CoupleId, Integer>> judgeScores,
    int majority
) {
    Map<CoupleId, Double> results = new HashMap<>();
    List<Couple> unplaced = new ArrayList<>(couples);
    int nextPlace = 1;

    for (int col = 1; col <= couples.size() && !unplaced.isEmpty(); col++) {
        final int P = col;
        // Count "P and higher" for each unplaced couple
        Map<CoupleId, Long> counts = new HashMap<>();
        Map<CoupleId, Long> sums = new HashMap<>();
        for (Couple c : unplaced) {
            List<Integer> qualifying = judgeScores.values().stream()
                .map(j -> j.get(c.getId()))
                .filter(mark -> mark <= P)
                .collect(toList());
            counts.put(c.getId(), (long) qualifying.size());
            sums.put(c.getId(), qualifying.stream().mapToLong(i -> i).sum());
        }

        // Find couples with majority
        List<Couple> withMajority = unplaced.stream()
            .filter(c -> counts.get(c.getId()) >= majority)
            .sorted(Comparator
                .comparingLong((Couple c) -> -counts.get(c.getId()))  // Rule 6: more is better
                .thenComparingLong(c -> sums.get(c.getId())))         // Rule 7: lower sum is better
            .collect(toList());

        // Handle equal majority+sum ties (Rule 7 extended)
        // ... assign consecutive places, averaging for unbreakable ties

        for (Couple c : withMajority) {
            results.put(c.getId(), (double) nextPlace++);
            unplaced.remove(c);
        }
    }
    return results;
}
```

---

## Edge Cases & Gotchas

| Situation | Correct behavior |
|-----------|-----------------|
| No couple has majority for place 1 | Move to "2nd and higher" column (Rule 8) |
| Awarded place ≠ column being inspected | Normal — column 3 can award place 1 |
| Tied majority + tied sum in single dance | Move to next column for TIED COUPLES ONLY |
| Fractional place in Final Summary (2.5) | Counts as next whole number when counting, face value when summing |
| Rule 10 tie — same count AND same sum | Go to Rule 11, NOT to lower places |
| Rule 11 new majority | `floor((numDances × numJudges) / 2) + 1` |
| Unbreakable tie after Rule 11 | Chairman decides; announce as tied at highest position |
| 8+ couples recalled from semi | Another preliminary round required (Chairman decides) |

---

## Worked Mini-Example (5 judges, 6 couples, 1 dance)

```
Judges: A B C D E    majority = 3
Couple  A  B  C  D  E  | col1  col1-2  col1-3  col1-4  col1-5  col1-6 | Place
51      1  1  1  2  1  |  4      —       —       —       —       —    |  1
52      4  2  2  1  2  |  1      4       —       —       —       —    |  2
53      3  3  3  5  4  |  —      —       3       —       —       —    |  3
54      2  4  5  4  3  |  —      1       2       4       —       —    |  4
55      5  6  4  3  5  |  —      —       1       2       4       —    |  5
56      6  5  6  6  6  |  —      —       —       —       1       5    |  6
```

Rule 7 example: couples 74 and 75 both have 4 votes in "4th and higher", both sum to 14 → move to "5th and higher" → 74 has 6, 75 has 5 → Rule 6: 74 gets 4th, 75 gets 5th.
