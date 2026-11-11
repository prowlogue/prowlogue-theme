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
