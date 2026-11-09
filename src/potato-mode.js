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
        announce = false;
        root.removeAttribute(mark);
        test();
    });

    const saved = document.cookie.match(/(?:^|; )prowlogue-lite=([01])/)?.[1];
    if (saved === '1') root.setAttribute(mark, '');
    else if (saved === '0') watch();
    else test();
})();
