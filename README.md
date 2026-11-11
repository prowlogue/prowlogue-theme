<div align="center">
  <img alt="Prowlogue" src="./.github/readme/prowlogue-wide.png">

  <h1>Prowlogue for Jellyfin Web</h1>

  <img alt="Jellyfin 10.11 and 12" src="https://img.shields.io/badge/Jellyfin-10.11%20%7C%2012-9962be"/>
  <a href="https://discord.gg/e8A3D9P7fk"><img alt="Join the community on Discord" src="https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?logo=discord&logoColor=white"/></a>
</div>

<p align="center">
  A polished, minimal browser theme built on the look and feel of the <a href="https://prowlogue.app"><b>Prowlogue</b></a> tvOS app.<br>
  One-line install. Nothing to host. Updates automatically.
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

3. Select **Save**.
4. **Recommended:** let slow devices switch to [potato mode](#-potato-mode) by themselves. This needs the [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector) plugin.
   1. Open **Dashboard → Plugins → JavaScript Injector** and tick **Allow external script URLs**.
   2. Select **Add Script**, name it `Potato Mode | Low End Devices`, and paste this into the **Script URL**:

      ```text
      https://theme.prowlogue.app/v1/potato-mode.js
      ```

   3. Leave the code box empty and **Requires Authentication** off, then select **Save**.
5. Reload the page.

That's it.

### 🥔 Potato mode | Slow devices

If your device can't keep up with the theme or you can't add the script in step 4, use the lite version instead:

```css
@import url("https://theme.prowlogue.app/v1/prowlogue-lite.css");
```

**Just you:** paste it in **Settings → Display → Custom CSS code**. It applies in that browser. Tick **Disable server-provided custom CSS code** so the browser doesn't load other themes.

> [!TIP]
> **Not the server admin?** Paste the theme's line into **Settings → Display → Custom CSS code** instead. It applies to you, in that browser. Step 4 needs an admin, so on a slow device use the [lite version](#-potato-mode--slow-devices) instead.

> [!IMPORTANT]
> Keep it as the first line. Browsers ignore an `@import` that comes after any other CSS.

### Requirements

| Requirement | Supported |
| --- | --- |
| **Jellyfin** | 12.x and 10.11.x |
| **Display mode** | **Auto**, **Desktop** or **Mobile** (Settings → Display). Auto is the default. Jellyfin 12 lists the other two as **Desktop (Legacy)** and **Mobile (Legacy)**. |
| **Theme** | **Dark** (Settings → Display). This is the default. |
| **Browser** | Chrome 105, Safari 15.4 or Firefox 121, or newer |

The **TV** display mode and the admin dashboard keep the stock Jellyfin look. Servers older than 10.11 aren't supported, and neither is the **Experimental** display mode on 10.11.

### Updates

There's nothing to do. Your browser starts from the copy it already has, so the theme never holds up a page, and fetches any new release in the background. The release shows from the next reload. The potato mode script updates the same way when it's added by its address, as in step 4.

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
- A device that stutters while scrolling, under 25 frames a second for 2.25 seconds, switches on the spot, and the potato's card says so.
- It stays on until the browser closes. Clicking the potato tests the device again. If it still can't keep up, the card says **STILL A POTATO**.

[Step 4 of Install](#-install) adds the script by its address, so it updates with the theme. To paste it in instead, without allowing external script URLs: keep the theme's line in **Dashboard → Branding**, then in **Dashboard → Plugins → JavaScript Injector**, select **Add Script**, name it `Potato Mode | Low End Devices`, paste this into the code box, leave **Requires Authentication** off, and select **Save**. A pasted copy doesn't update by itself.

```js
/*
 * Prowlogue potato mode, for the JavaScript Injector plugin with Requires Authentication off, so it runs from the
 * first page. It turns the theme's lite look on for a device that can't draw frosted glass smoothly: one without
 * a hardware GPU, found at once, or one that scrolls at under 25 frames a second for 2.25 seconds. It only marks
 * <html> with data-prowlogue-lite, and the stylesheet does the rest. The verdict lasts until the browser closes,
 * and a click on the potato in the top bar tests the device again.
 */
(() => {
    const root = document.documentElement;
    const mark = 'data-prowlogue-lite';
    const badge = '#reactRoot > div > header.MuiAppBar-root > .MuiToolbar-root:first-child > .MuiBox-root ~ .MuiBox-root, html:not(.layout-tv) #reactRoot > div > .skinHeader .headerRight > .currentTimeText';
    const minFps = 25;
    const windowMs = 2250;
    const slowMs = 1000 / minFps;

    let lengths = [];
    let time = 0;
    let slow = 0;
    let last = 0;
    let lastScroll = 0;
    let watching = false;
    let announce = true;

    // A session cookie keeps the verdict until the browser closes: 1 for lite, 0 for a GPU that only needs watching.
    const save = (verdict) => {
        document.cookie = `prowlogue-lite=${verdict}; SameSite=Strict`;
    };

    // "new" opens the potato's card by itself. A test started from the potato stays quiet: its card is under the
    // pointer already, or was moments ago.
    const lite = () => {
        removeEventListener('scroll', onScroll, true);
        save(1);
        root.setAttribute(mark, announce ? 'new' : '');
    };

    // The frame rate over the last 2.25 seconds of scrolling, which is when frosted glass costs most, judged on every
    // frame. Struggling is slow on average and slow most of the time: more than half the frames take longer than
    // 1/25 s, so a few long freezes among fast frames don't count. A gap over half a second is a pause, such as a
    // hidden tab, not a frame.
    const frame = (now) => {
        const length = now - last;
        if (last && length < 500) {
            lengths.push(length);
            time += length;
            if (length > slowMs) slow++;
            while (time - lengths[0] >= windowMs) {
                const oldest = lengths.shift();
                time -= oldest;
                if (oldest > slowMs) slow--;
            }
            if (time >= windowMs && lengths.length < (minFps * time) / 1000 && slow * 2 > lengths.length) {
                watching = false;
                return lite();
            }
        }
        last = now;
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
        lengths = [];
        time = 0;
        slow = 0;
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

    // "new" lasts as long as the card's announcement, and "still" as long as its title's blinks.
    const settle = (event) => {
        const value = root.getAttribute(mark);
        const done = (event.animationName === 'pl-potato-announce' && value === 'new')
            || (event.animationName === 'pl-potato-still' && value === 'still');
        if (done) root.setAttribute(mark, '');
    };
    addEventListener('animationend', settle);
    addEventListener('animationcancel', settle);

    // Without a hardware GPU the test answers at once and nothing on the page changes, so "still" has the card's
    // title say so.
    addEventListener('click', (event) => {
        if (!root.hasAttribute(mark) || !event.target.matches?.(badge)) return;
        announce = false;
        root.removeAttribute(mark);
        test();
        if (root.hasAttribute(mark)) root.setAttribute(mark, 'still');
    });

    const saved = document.cookie.match(/(?:^|; )prowlogue-lite=([01])/)?.[1];
    if (saved === '1') root.setAttribute(mark, '');
    else if (saved === '0') watch();
    else test();
})();
```

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
- Check that your server runs Jellyfin 10.11 or newer.
- Check that **Settings → Display → Display mode** isn't set to **TV**, or to **Experimental** on Jellyfin 10.11.
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

If you add the potato mode script by its address, add `https://theme.prowlogue.app` to `script-src` too. Keep the rest of your policy as it is. If only the font is blocked, text falls back to Jellyfin's Noto Sans.

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
