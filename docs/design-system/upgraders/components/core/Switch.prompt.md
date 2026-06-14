Toggle switch — rouge when on, springy thumb. Settings, theme Sombre/Clair, notification opt-ins.

```jsx
<Switch defaultChecked label="Notifications" />
<Switch checked={dark} onChange={e => setDark(e.target.checked)} label="Sombre" />
```
