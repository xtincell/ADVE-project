# Image credits

Toutes les images de la landing sont sous licence libre (Unsplash License — usage commercial autorisé, pas d'attribution obligatoire mais bonne pratique).

| Fichier | Source | Photo ID |
|---|---|---|
| `avatar-1.jpg` | [Unsplash](https://unsplash.com/photos/photo-1687422808384-c896d0efd4ab) | `photo-1687422808384-c896d0efd4ab` |
| `avatar-2.jpg` | [Unsplash](https://unsplash.com/photos/photo-1666867540898-aaa1993ffabc) | `photo-1666867540898-aaa1993ffabc` |
| `avatar-3.jpg` | [Unsplash](https://unsplash.com/photos/photo-1573496527892-904f897eb744) | `photo-1573496527892-904f897eb744` |
| `hero-bg.jpg` | [Unsplash](https://unsplash.com/photos/photo-1573164574572-cb89e39749b4) | `photo-1573164574572-cb89e39749b4` |

Sujets : professionnels d'Afrique de l'Ouest (Sénégal, Côte d'Ivoire, Ghana, Nigeria) — alignés avec le marché cible UPgraders.

Pour régénérer ces images via le pipeline Ptah une fois `FREEPIK_API_KEY` ou `ADOBE_FIREFLY_CLIENT_ID/SECRET` configuré :

```bash
# Via Cockpit /cockpit/forges — formulaire interactif
# OU via tRPC direct :
trpc.ptah.materializeBrief.mutate({
  strategyId,
  sourceIntentId: "manual-landing-asset",
  brief: {
    briefText: "Professional headshot west african businesswoman, studio lighting, warm smile, business attire",
    forgeSpec: { kind: "image", providerHint: "magnific", modelHint: "nano-banana-pro", parameters: { width: 400, height: 400 } },
    pillarSource: "D",
    manipulationMode: "entertainer"
  }
})
```
