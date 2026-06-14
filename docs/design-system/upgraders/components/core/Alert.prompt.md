Inline alert with tinted surface + auto status icon. Tone drives colour; description is children.

```jsx
<Alert tone="success" title="Succès">Votre projet a été enregistré avec succès.</Alert>
<Alert tone="warning" title="Attention">Cette action est irréversible.</Alert>
<Alert tone="danger" title="Erreur" onClose={() => {}}>Une erreur est survenue.</Alert>
```

Tones: `success · warning · danger · info`.
