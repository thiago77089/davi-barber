# ✂ Davi Barber — Sistema de Agendamentos

Site completo de agendamentos para barbearia com painel admin.

---

## 📁 Estrutura do projeto

```
davi-barber/
├── server.js          ← Backend (Node.js + Express)
├── package.json       ← Dependências
├── db/                ← Banco de dados SQLite (criado automaticamente)
└── public/
    ├── index.html     ← Site principal (clientes)
    └── admin.html     ← Painel administrativo (Davi)
```

---

## 🚀 Como colocar no ar (Railway — grátis)

### Passo 1 — Crie uma conta
Acesse https://railway.app e crie uma conta gratuita com o GitHub.

### Passo 2 — Instale o Git e suba o projeto
No terminal da pasta do projeto:

```bash
git init
git add .
git commit -m "primeiro deploy"
```

### Passo 3 — Crie um repositório no GitHub
1. Acesse https://github.com/new
2. Crie um repositório chamado `davi-barber`
3. Siga as instruções para conectar ao seu repositório local:

```bash
git remote add origin https://github.com/SEU_USUARIO/davi-barber.git
git push -u origin main
```

### Passo 4 — Deploy no Railway
1. Acesse https://railway.app/new
2. Clique em **"Deploy from GitHub repo"**
3. Selecione o repositório `davi-barber`
4. O Railway detecta o Node.js automaticamente e faz o deploy

### Passo 5 — Configurar variáveis de ambiente
No painel do Railway, vá em **Variables** e adicione:

| Variável         | Valor         |
|------------------|---------------|
| `PORT`           | `3000`        |
| `ADMIN_PASSWORD` | (sua senha)   |

> ⚠️ Troque a senha padrão `davi1234` por algo seguro!

### Passo 6 — Domínio
No Railway, vá em **Settings → Domains** e clique em **Generate Domain**.
Você receberá um link tipo: `https://davi-barber.up.railway.app`

---

## 💻 Rodar localmente (para testar)

```bash
npm install
node server.js
```

Acesse: http://localhost:3000

---

## 🔐 Painel Administrativo

Acesse: `https://seu-dominio/admin.html`

Funcionalidades:
- Ver todos os agendamentos
- Filtrar por status (confirmado, concluído, cancelado)
- Marcar como concluído ou cancelado
- Excluir agendamentos
- Estatísticas rápidas (total, hoje, confirmados, concluídos)

---

## ⚙️ Personalizar

### Mudar preços ou serviços
Abra `public/index.html` e encontre o objeto `LANGS`. Edite os campos `services` de cada idioma.

### Mudar horários disponíveis
No mesmo arquivo, a variável `unavailIdx` define os horários bloqueados (por índice).
Os horários vão de 9:00 até 19:30, de 30 em 30 minutos.

### Mudar a senha admin
Crie a variável de ambiente `ADMIN_PASSWORD` no Railway, ou edite a linha no `server.js`:
```js
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'sua_senha_aqui';
```

---

## 🛠 Tecnologias usadas

- **Frontend:** HTML, CSS, JavaScript puro
- **Backend:** Node.js + Express
- **Banco de dados:** SQLite (via @libsql/client)
- **Hospedagem recomendada:** Railway (grátis)
