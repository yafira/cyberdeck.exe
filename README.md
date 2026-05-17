# cyberdeck.exe

a moodboard by yafira & alanna for [SOFTER's](https://softer.global) cyberdeck residency open call.

pulls live from an [are.na channel](https://www.are.na/yafira/cyberdeck-exe-9tnkemv_c50).

## stack

- html, css, vanilla js
- [are.na api v2](https://dev.are.na/documentation) for moodboard data
- [departure mono](https://departuremono.com), self-hosted
- vercel for hosting

## structure

```
cyberdeck-exe/
├── index.html         moodboard
├── about.html         open call brief + about
├── style.css
├── script.js          are.na fetch + render
├── vercel.json        clean urls + caching
└── fonts/             drop departure mono files here
```

## local

```
npx vercel dev
```

server at `http://localhost:3000`. handles clean urls just like production.

## deploy

connected to github. every push to `main` deploys automatically.

## fonts

download departure mono from [departuremono.com](https://departuremono.com) and drop the `.woff2` and `.otf` files into `./fonts/`.

## people

- yafira ~ [@electrocutelab](https://instagram.com/electrocutelab)
- alanna ~ [@alannabean](https://instagram.com/alannabean)
