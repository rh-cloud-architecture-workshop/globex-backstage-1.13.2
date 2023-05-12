[![headline](docs/assets/headline.png)](https://backstage.io/)

# [Backstage](https://backstage.io)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## This is NOT the official Backstage repo (as you might have guessed from the repo hierarchy, just saying...)

This repo is a snapshot of the 1.13.2 version, used for development and debugging/tracing.

==**Tip**== (learned the hard way :weary:, so here to share) - if you are developing more than a boilerplate Backstage for your own needs, fork the [Backstage Repo](https://github.com/backstage/backstage) or, as we did, take a [release version](https://github.com/backstage/backstage/releases) and build from there.

If you have created your backstage app using `npx @backstage/create-app` the corresponding minified dirty code will be present in your repository somewhere under `node_modules/@backstage/<module>/dist/cjs/<somethingsomething>-xxxx.cjs.js` and it is alomst impossible to debug/trace/inspect (or read) this.



## License

Copyright 2020-2022 © The Backstage Authors. All rights reserved. The Linux Foundation has registered trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our Trademark Usage page: https://www.linuxfoundation.org/trademark-usage

Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0

## Security

Please report sensitive security issues using Spotify's [bug-bounty program](https://hackerone.com/spotify) rather than GitHub.

For further details, see our complete [security release process](SECURITY.md).
