<div align="center">
  <img alt="Prowlogue" src="./.github/readme/prowlogue-wide.png">

  <h1>Prowlogue for Jellyfin Web</h1>

  <img alt="Jellyfin 12" src="https://img.shields.io/badge/Jellyfin-12-9962be"/>
  <img alt="Pure CSS" src="https://img.shields.io/badge/pure-CSS-0a0a23"/>
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-lightgrey"/>
  <a href="https://prowlogue.app"><img alt="prowlogue.app" src="https://img.shields.io/badge/web-prowlogue.app-0a0a23"/></a>
  <a href="https://discord.gg/e8A3D9P7fk"><img alt="Join the community on Discord" src="https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?logo=discord&logoColor=white"/></a>
</div>

<p align="center">
  The look and feel of <a href="https://prowlogue.app"><b>Prowlogue</b></a>, the Jellyfin client for Apple TV, in your browser.<br>
  One line to install. Nothing to host. Updates itself.
</p>

<p align="center">
  <a href="#-install"><b>Install</b></a>
  &nbsp;·&nbsp;
  <a href="#-screenshots">Screenshots</a>
  &nbsp;·&nbsp;
  <a href="#-plugins">Plugins</a>
  &nbsp;·&nbsp;
  <a href="#-troubleshooting">Troubleshooting</a>
</p>

![The Prowlogue theme on the Jellyfin Home page, with a full-screen film backdrop above a frosted panel of poster rows](./.github/readme/home.webp)

## 🚀 Install

1. In Jellyfin, open **Dashboard → Branding**.
2. Paste this line at the very top of **Custom CSS code**:

   ```css
   @import url("https://theme.prowlogue.app/v1/prowlogue.css");
   ```

3. Select **Save**, then reload the page.

That's it. The theme now applies to everyone on your server.

> [!TIP]
> **Not the server admin?** Paste the same line into **Settings → Display → Custom CSS code** instead. It applies to you, in that browser.

> [!IMPORTANT]
> Keep it as the first line. Browsers ignore an `@import` that comes after any other CSS.

### Requirements

| Requirement | Supported |
| --- | --- |
| **Jellyfin** | 12.x |
| **Display mode** | **Auto** (Settings → Display). This is the default. |
| **Theme** | **Dark** (Settings → Display). This is the default. |
| **Browser** | Chrome 105, Safari 15.4 or Firefox 121, or newer |

Everything else keeps the stock Jellyfin look, including the Legacy and TV display modes and the admin dashboard.

### Updates

There's nothing to do. Your browser starts from the copy it already has, so the theme never holds up a page, and fetches any new release in the background. The release shows from the next reload.

## ✨ Features

- **Cinematic Home:** a full-screen Spotlight hero with the title's logo and overview, above rows on a frosted glass panel.
- **Clean posters:** rounded artwork without the clutter. Posters lift and glow on hover, with their actions one click away.
- **Rich detail pages:** artwork fills the screen behind the poster, logo, cast and episodes, with square action buttons above a wide Play button.
- **Floating player:** every control sits in one frosted panel, so the picture stays in view.
- **Frosted everywhere:** menus and the side drawer pick up the colours behind them.
- **Built for phones too:** the same design on a phone, upright or on its side.
- **Smooth loading:** pages ease in and artwork fades in, instead of popping into place.
- **Light:** one stylesheet under 50 KB, with its font built in and no JavaScript. It also respects your system's **Reduce motion** and **Reduce transparency** settings.
- **Potato mode:** slow devices get a lighter look, on their own with a small script or for everyone with the lite version. Frosted glass becomes a see-through tint, so scrolling stays smooth. [See how](#-potato-mode).

## 🥔 Potato mode

Frosted glass needs a graphics chip to stay smooth. Potato mode swaps every frosted glass effect for a see-through tint, which still takes its colour from what's behind it. A potato in the top bar shows when it's on. Point at it to see why.

### For the devices that need it

With the [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector) plugin, a small script turns potato mode on only where it's needed, and everyone else keeps the full look:

- A browser without hardware acceleration switches before the page appears.
- A device that stutters while scrolling, under 25 frames a second for 3 seconds, switches on the spot, and the potato's card says so.
- It stays on until the browser closes. Clicking the potato tests the device again.

Keep the theme's line in **Dashboard → Branding**. In **Dashboard → Plugins → JavaScript Injector**, select **Add Script**, paste this, leave **Requires Authentication** off, and select **Save**:

```js
/*
 * Prowlogue potato mode, for the JavaScript Injector plugin with Requires Authentication off, so it runs from the
 * first page. It turns the theme's lite look on for a device that can't draw frosted glass smoothly: one without
 * a hardware GPU, found at once, or one that scrolls at under 25 frames a second for 3 seconds. It only marks
 * <html> with data-prowlogue-lite, and the stylesheet does the rest. The verdict lasts until the browser closes,
 * and a click on the potato in the top bar tests the device again.
 */
(() => {
    const root = document.documentElement;
    const mark = 'data-prowlogue-lite';
    const badge = '#reactRoot > div > header.MuiAppBar-root > .MuiToolbar-root:first-child > .MuiBox-root ~ .MuiBox-root';
    const minFps = 25;
    const sampleMs = 3000;

    let frames = 0;
    let time = 0;
    let last = 0;
    let lastScroll = 0;
    let watching = false;

    // A session cookie keeps the verdict until the browser closes: 1 for lite, 0 for a GPU that only needs watching.
    const save = (verdict) => {
        document.cookie = `prowlogue-lite=${verdict}; SameSite=Strict`;
    };

    // "new" opens the potato's card by itself, once.
    const lite = () => {
        removeEventListener('scroll', onScroll, true);
        save(1);
        root.setAttribute(mark, 'new');
    };

    // Frame rate while something scrolls, which is when frosted glass costs most. A gap over half a second is a
    // pause, such as a hidden tab, not a frame.
    const frame = (now) => {
        if (last && now - last < 500) {
            frames++;
            time += now - last;
        }
        last = now;
        if (time >= sampleMs) {
            if (frames < (minFps * time) / 1000) {
                watching = false;
                return lite();
            }
            frames = 0;
            time = 0;
        }
        if (now - lastScroll < 200) requestAnimationFrame(frame);
        else watching = false;
    };

    const onScroll = () => {
        lastScroll = performance.now();
        if (watching) return;
        watching = true;
        last = 0;
        requestAnimationFrame(frame);
    };

    const watch = () => {
        frames = 0;
        time = 0;
        save(0);
        addEventListener('scroll', onScroll, { capture: true, passive: true });
    };

    // A browser refuses WebGL with this flag when it would have to draw it in software: no hardware GPU, or
    // hardware acceleration turned off. Some draw the page in software and still allow it, which watching catches.
    const test = () => {
        const gl = document.createElement('canvas').getContext('webgl', { failIfMajorPerformanceCaveat: true });
        if (!gl) return lite();
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        watch();
    };

    const announced = (event) => {
        if (event.animationName === 'pl-potato-announce' && root.getAttribute(mark) === 'new') root.setAttribute(mark, '');
    };
    addEventListener('animationend', announced);
    addEventListener('animationcancel', announced);

    addEventListener('click', (event) => {
        if (!root.hasAttribute(mark) || !event.target.matches?.(badge)) return;
        root.removeAttribute(mark);
        test();
    });

    const saved = document.cookie.match(/(?:^|; )prowlogue-lite=([01])/)?.[1];
    if (saved === '1') root.setAttribute(mark, '');
    else if (saved === '0') watch();
    else test();
})();
```

> [!NOTE]
> To keep the script up to date with the theme, put `https://theme.prowlogue.app/v1/potato-mode.js` in **Script URL** instead, and turn on **Allow external script URLs** in the plugin's settings.

### For everyone

To turn potato mode on for every device, replace the theme's line in **Dashboard → Branding** with this one:

```css
@import url("https://theme.prowlogue.app/v1/prowlogue-lite.css");
```

Select **Save**, then reload the page. To go back, put the theme's line back.

To use it in one browser only, paste the same line at the top of **Settings → Display → Custom CSS code** in that browser. Also tick **Disable server-provided custom CSS code** there, so the browser doesn't load the full theme as well.

The full theme also turns potato mode on by itself when a system asks for less transparency: **Transparency effects** off on Windows, or **Reduce transparency** on a Mac, in Chrome, Edge and other Chromium browsers.

> [!TIP]
> Check that hardware acceleration is on first. In Chrome it's **Settings → System → Use graphics acceleration when available**. With it on, most computers run the full look smoothly.

## 📸 Screenshots

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="./.github/readme/home-rows.webp" alt="Home page rows of posters on a frosted panel" width="100%"><br>
      <b>Home rows</b><br>
      Your library on frosted glass, with a lift and a glow on hover.
    </td>
    <td width="50%" valign="top">
      <img src="./.github/readme/movie.webp" alt="A movie's detail page with its artwork filling the screen" width="100%"><br>
      <b>Movies</b><br>
      Full-screen artwork, the title's logo, and everything you need in one place.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="./.github/readme/series.webp" alt="A TV series page with its latest season's episodes and a row of seasons" width="100%"><br>
      <b>TV shows</b><br>
      Episodes and seasons side by side with the poster.
    </td>
    <td width="50%" valign="top">
      <img src="./.github/readme/player.webp" alt="The video player with its controls in a floating frosted panel" width="100%"><br>
      <b>Player</b><br>
      A floating frosted panel that keeps the picture in view.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="./.github/readme/menu.webp" alt="The side drawer open over a library of collections" width="100%"><br>
      <b>Libraries and drawer</b><br>
      Poster grids, with a frosted drawer that picks up the art behind it.
    </td>
    <td width="50%" valign="top">
      <img src="./.github/readme/dialog.webp" alt="A plugin's settings dialog on a navy panel" width="100%"><br>
      <b>Dialogs</b><br>
      Plugin settings and pop-ups fit right in.
    </td>
  </tr>
</table>

## 🧩 Plugins

The theme works on a plain Jellyfin server. If you run any of these plugins, it styles them too:

| Plugin | What you get |
| --- | --- |
| [Media Bar](https://github.com/IAmParadox27/jellyfin-plugin-media-bar) | The full-screen Spotlight hero on Home |
| [KefinTweaks](https://github.com/ranaldsgift/KefinTweaks) | Its Home rows, Watchlist, breadcrumbs and desktop drawer |
| [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) | Seerr results in search |
| [Home Screen Sections](https://github.com/IAmParadox27/jellyfin-plugin-home-sections) | Its Seerr Discover rows on Home |
| [InPlayerEpisodePreview](https://github.com/Namo2/InPlayerEpisodePreview) | The episode list in the player |

## 🔧 Troubleshooting

<details>
<summary><b>The theme doesn't show up</b></summary>

- Check that the `@import` is the very first line of **Custom CSS code**.
- Check that **Settings → Display → Display mode** is set to **Auto**.
- Check that **Disable server-provided custom CSS code** is turned off in **Settings → Display**.
- Check that your browser meets the [requirements](#requirements). Older browsers keep the stock look.

</details>

<details>
<summary><b>It works locally but not through my reverse proxy</b></summary>

A `Content-Security-Policy` header can block the stylesheet. Add the theme's address to `style-src`, and `data:` to `font-src` for the built-in font:

```nginx
style-src 'self' 'unsafe-inline' https://theme.prowlogue.app;
font-src 'self' data:;
```

Keep the rest of your policy as it is. If only the font is blocked, text falls back to Jellyfin's Noto Sans.

</details>

<details>
<summary><b>Scrolling stutters on one device</b></summary>

Turn on hardware acceleration in that browser's settings. If it still stutters, install the [potato mode script](#for-the-devices-that-need-it), or use the [lite version](#for-everyone) in that browser.

</details>

<details>
<summary><b>I don't see the latest update</b></summary>

Reload the page twice. The first reload fetches the update in the background, and the second shows it. A tab that's already open keeps the version it loaded until you reload it.

</details>

<details>
<summary><b>How do I remove the theme?</b></summary>

Delete the `@import` line from **Custom CSS code**, select **Save**, and reload the page.

</details>

## 🙌 Credits

Inspiration was taken from [Abyss](https://github.com/AumGupta/abyss-jellyfin) by Om Gupta.

## 📜 License

Released under the [MIT License](./LICENSE). You're free to use, change, redistribute and sell this theme, as long as the copyright notice and license stay with it. It comes with no warranty.

The built-in font keeps its own license. See [NOTICE](./NOTICE).

Prowlogue is an independent project and is **not affiliated with or endorsed by** the Jellyfin project.

---

<p align="center"><sub>Prowlogue for Jellyfin Web © 2026 guama.dev · Jellyfin® is a trademark of the Jellyfin project.</sub></p>
