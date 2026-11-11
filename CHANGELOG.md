# Changes

0.2.0 - unreleased

  - Added opt-in `algorithm: 'emeans'` (mini-batch e-means), backed by the new standalone [`emeans`](packages/emeans) package, with `epochs`, `batchSize` and `alpha0` options. Lloyd remains the default.
  - Fixed `iterations` reporting one too many when `maxIterations` was reached.
  - Fixed the default `assignments` array being allocated with length `k` instead of `n`.
  - Added `bench/run.js`, more tests (100% line coverage) and a GitHub Actions workflow replacing Travis.

0.1.2 - 2019/10/31

  - Adressing vulnerabilities:
    - Bump lodash from 4.17.11 to 4.17.15.
    - Bump eslint-utils from 1.3.1 to 1.4.3.
  - Updating all dependencies to most recent versions.

0.1.1 - 2019/06/12

  - Updating [budo](https://github.com/mattdesl/budo) to recent version due to potential security vulnerabilities.
  - Updating all dependencies to most recent versions.

0.1.0 - 2019/06/03

  - refactored API thanks to [rreuser](https://github.com/rresuer)

0.0.34 - 2015/10/19

  - renamed to "kmpp" and released on the NPM

  - performance optimizations

    - using Manhattan distance instead of euclean distance
    - reducing function calls
    - random initialization by choosing from exising points, thus maxWidth
      and maxHeight are not required anymore

0.0.2 - 2012/12/05

  - Removed unnecessary dependency on _/Lo-Dash

0.0.1 - 2012/08/15

  - Initial release