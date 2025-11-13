/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
}

module.exports = nextConfig
```

---

## 📄 ファイル3: `.gitignore`
```
node_modules/
.next/
.env.local
.vercel
*.log
.DS_Store