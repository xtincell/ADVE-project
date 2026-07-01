UPgraders logo — render the **real brand artwork** by `variant` (recommended), or
omit `variant` for the theme-recolouring font wordmark (red "Up" + foreground "graders").

Artwork lives in `assets/logos/`. Set `basePath` to the folder's path relative to the
host page (default `assets/logos`). Size by `size` (preset or px = height).

```jsx
// Real artwork (recommended)
<Logo variant="lockup-horizontal" size={56} basePath="../assets/logos" />
<Logo variant="lockup-vertical" size={120} />
<Logo variant="mark" size="lg" />              // UP + rocket (rouge)
<Logo variant="mark" size="lg" circle />        // UP rocket on white circle
<Logo variant="wordmark" size={40} />           // UPgraders + rocket
<Logo variant="monogram" size={48} />           // UP + rocket (mono)
<Logo variant="lockup-horizontal-mono" size={48} /> // monochrome lockup
<Logo variant="full" size={88} />               // word + rocket + tagline

// Font wordmark (recolours with the theme — no image)
<Logo size="lg" markSrc="assets/logos/upgraders-icon.png" />
<Logo markOnly markSrc={icon} size="md" />
```
