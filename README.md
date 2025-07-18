# <img src="src/assets/logos/reyohoho_logo.png" height="40" style="margin-bottom: -1px;"> ReYohoho Twitch Extension | RTE

[![Build Status](https://github.com/night/betterttv/actions/workflows/ci.yml/badge.svg)](https://github.com/night/betterttv/actions/workflows/ci.yml) [![Discord](https://img.shields.io/discord/229471495087194112?color=5865F2&label=discord)](https://discord.gg/nightdev) [![Crowdin](https://badges.crowdin.net/betterttv/localized.svg)](https://crowdin.com/project/betterttv)

> **Forked from [@night/betterttv](https://github.com/night/betterttv)**

## Support the Original Authors

This project is a fork of BetterTTV. Please consider supporting the original authors by visiting [betterttv.com](https://betterttv.com/) and using their official extension.

# Building BetterTTV

## Getting the essentials

1. Install nodejs.
2. Run `npm install` within the BetterTTV directory.

## Development

We use webpack to concatenate all of the files and templates into one.
Just run the following command from the BetterTTV directory to start a dev server.

```
npm start
```

A webserver will start and you are able to use the development version of BetterTTV on Twitch using this userscript in a script manager like TamperMonkey:

```
// ==UserScript==
// @name         BetterTTV Development
// @description  Enhances Twitch with new features, emotes, and more.
// @namespace    http://betterttv.com/
// @copyright    NightDev, LLC
// @icon         https://cdn.betterttv.net/assets/logos/bttv_logo.png
// @version      0.0.1
// @match        https://*.twitch.tv/*
// @grant        none
// ==/UserScript==

(function betterttv() {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'http://127.0.0.1:2888/betterttv.js';
    const head = document.getElementsByTagName('head')[0];
    if (!head) return;
    head.appendChild(script);
})()
```

Once installed you should disable BetterTTV's main extension so BetterTTV will only be loaded from your computer.

**Debug Messages:**

In order to receive debug messages inside the browser's console log, you must toggle the consoleLog localStorage setting.

Type this in the JavaScript console to enable console logging:

```
BetterTTV.settings.set('consoleLog', true);
```

## Linting

We use [ESLint](https://eslint.org/) to ensure a consistent code style and avoid buggy code.

Running `npm run lint` will automatically check for any errors in the code. Please fix any errors before creating a pull request. Any warnings produced prior to your changes can be ignored.

**Live Linting with Sublime Text:**

If you use Sublime Text as your text editor, you can set it up to highlight any errors that ESLint would throw in real-time.

1. Get ESLint using `npm install eslint`
2. Install [Sublime Package Control](https://packagecontrol.io/installation)
3. Install [SublimeLinter](https://www.sublimelinter.com/en/latest/installation.html#installing-via-pc)
4. Install [SublimeLinter-eslint](https://github.com/roadhump/SublimeLinter-eslint#linter-installation)

**Live Linting with VSCode:**

If you use VSCode as your text editor, you can set it up to highlight any errors that ESLint would throw in real-time.

1. Get ESLint using `npm install eslint`
2. Install the ESLint extension from the extensions marketplace

## TODO

- Preview for links in chat
- Check stock bttv features
- Fix buttons after restart stream or change layout and compressor state
- Fix left chat position
- Fix hide left panel categories
- System messages too long
- Fix custom emotes preview in input
- WebSocket proxy support for FFZ/BTTV emote updates (already works if there's access to their addresses without VPN)
- Integration with 1080p proxy, possibly with 1440p support
- Check 7tv personalized emotes
- No sound after restart of stream by streamer?
- Add quick links to videos and so on under the streamer
- Custom badges (Our badge - choice of any emote)
- Shazam current track on stream? https://github.com/shazamio/ShazamIO
- Preview emotes from links
- Add howto host own proxy

## Changes compared to the original BetterTTV

- Some ui icons not loading without proxy
- Tooltip thread
- 7tv cosmetics
- Integrate copypaste search?
- If ASCII art ⣿⣿⣿⡿ with similes is sent to the chat, then reduce the size of such message to fit in
- Fix chat swipe for broadcasters
- You can't click on a link in a deleted message
- Display timeouts, bans
- Highlight first message, current implementation in bttv does not work
- FFZ giant emotes support
- Player restart button (similar to FFZ)
- Fixed support for zero-width 7TV emotes
- Message copy button
- Video mirror button
- Audio compressor in player (similar to FFZ)
- Proxying requests to API and image fetching for Russia
- Proxying 7TV emote updates (add/remove/rename)
- Middle mouse button on emote opens its page
- System message added to chat about emote updates in channel
- Moderator slider like in 7TV
- Added proxy to BTTV emoji
- Fixed display of BTTV emoji
- BTTV emoji added to auto add-on
- Added author's nickname to 7TV admin messages
- In settings now you can change the size of emotes
- Added message when loading the list of emotes 7TV
- Added message when loading emotes errors
- Fixed displaying of 7TV overlay emotes
