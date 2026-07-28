const test = require("node:test");
const assert = require("node:assert/strict");

const {
  computeAverage,
  computeMedian,
  computeWorst,
  createDefaultStats,
  getGamesPlayed,
  normalizeStats,
} = require("./storage");

test("computeAverage returns null when no games played", () => {
  assert.equal(computeAverage(createDefaultStats()), null);
  assert.equal(computeAverage({ record: null, falseStarts: 0, times: [] }), null);
});

test("computeAverage ignores false starts and rounds to nearest ms", () => {
  assert.equal(
    computeAverage({ record: 200, falseStarts: 5, times: [200, 210, 240] }),
    217
  );
});

test("computeMedian handles odd and even counts", () => {
  assert.equal(computeMedian({ times: [300, 200, 250] }), 250);
  assert.equal(computeMedian({ times: [300, 200, 250, 210] }), 230);
});

test("computeWorst returns the slowest valid time", () => {
  assert.equal(computeWorst({ times: [180, 240, 210] }), 240);
});

test("getGamesPlayed counts only valid times", () => {
  assert.equal(getGamesPlayed({ times: [180, 240] }), 2);
});

test("normalizeStats clamps invalid values and keeps record", () => {
  assert.deepEqual(
    normalizeStats({ record: 187.4, falseStarts: -2, times: [99.6, -1, "210"] }),
    { record: 187, falseStarts: 0, times: [100, 210] }
  );
});

test("normalizeStats defaults record to null", () => {
  assert.deepEqual(
    normalizeStats({ falseStarts: 2, times: [200] }),
    { record: null, falseStarts: 2, times: [200] }
  );
});
