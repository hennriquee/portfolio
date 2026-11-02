# Portfólio — Bruno Henrique

Site pessoal (desenvolvimento, dados e BI) feito com HTML, CSS e JavaScript puros,
animação 3D em **Three.js**, efeitos de rolagem com **GSAP + ScrollTrigger** e rolagem
suave com **Lenis**. Não precisa de etapa de build. Publicado na **Netlify**.

## Estrutura

```
├── public/                       # tudo o que vai para o ar
│   ├── index.html
│   └── assets/
│       ├── css/
│       │   ├── theme.css         # 🎨 cores, fontes e medidas (troque a cor aqui)
│       │   └── main.css          # layout, componentes e seções
│       ├── js/
│       │   ├── boot.js           # roda no <head>, prepara as animações
│       │   ├── config.js         # 📞 WhatsApp, e-mail e endpoint do formulário
│       │   ├── main.js           # ponto de entrada
│       │   └── modules/          # um arquivo por funcionalidade
│       ├── img/                  # foto, favicon e imagem de compartilhamento
│       ├── docs/                 # currículo em PDF
│       └── vendor/               # bibliotecas hospedadas localmente
├── netlify/functions/contact.mjs # função que envia o e-mail (/api/contact)
├── resume/curriculo.html         # fonte do currículo em PDF (não vai para o ar)
├── netlify.toml                  # pasta publicada + cabeçalhos de segurança
└── .env.example                  # variáveis do envio de e-mail
```

## Personalizar

**Trocar a cor do site** — em `public/assets/css/theme.css`, altere só `--brand`. Fundo,
destaques, brilhos e a animação 3D são calculados a partir dela.
Alguns itens são fixos e precisam ser trocados à mão se a cor mudar: a meta `theme-color`
no `index.html`, as cores do e-mail em `netlify/functions/contact.mjs`, o currículo
(`resume/curriculo.html`) e as imagens `og-image.jpg` / fundo da foto.

**WhatsApp e e-mail** — em `public/assets/js/config.js` (os links no HTML são só a versão
para quem estiver sem JavaScript).

**Experiências** — em `public/index.html`, seção `EXPERIÊNCIA`. Copie um `<li class="tl-item">`
e ajuste `data-start="AAAA-MM"` / `data-end="AAAA-MM"` (vazio = emprego atual).
A duração é calculada sozinha. Os números da seção "Sobre" (anos com dados, ferramentas e
experiências) também são calculados automaticamente.

**Currículo em PDF** — edite `resume/curriculo.html`, abra no Chrome/Edge, `Ctrl+P` →
"Salvar como PDF", margens "Nenhuma" e "Gráficos de plano de fundo" marcado.
Salve como `public/assets/docs/curriculo-bruno-henrique.pdf`.

## Rodar localmente

```bash
npm install
npx netlify dev     # site + formulário de contato (usa as variáveis do .env)
# ou, só o site:
npx serve public
```

## Publicar (Netlify)

O `netlify.toml` já diz para a Netlify publicar a pasta `public/` e onde está a função —
não é preciso mudar nada no painel de build.

Para o formulário enviar e-mails, cadastre em **Site configuration → Environment variables**
(escopo: *Functions*):

| Variável | O que é |
| --- | --- |
| `SMTP_USER` | o Gmail que envia as mensagens |
| `SMTP_PASS` | uma **senha de app** do Google ([myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — exige verificação em duas etapas) |
| `MAIL_TO` | onde você quer receber (pode ser o mesmo e-mail) |
| `CONTACT_SECRET` | texto aleatório longo para assinar os tokens anti-robô |

Gere o `CONTACT_SECRET` com:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Depois, faça um novo deploy. Se as variáveis não estiverem configuradas, o formulário
continua funcionando como atalho: mostra os botões de WhatsApp e e-mail já preenchidos.

> Dica: com o domínio definido, troque `og:image` no `index.html` por uma URL completa
> (ex.: `https://seusite.netlify.app/assets/img/og-image.jpg`) para a prévia aparecer
> no WhatsApp e no LinkedIn.

### Segurança do formulário

- Nenhuma credencial vai para o navegador: tudo fica nas variáveis de ambiente da Netlify.
- Sem serviço de terceiros (o antigo Formspree foi removido): a função envia direto pelo seu e-mail.
- Aceita apenas `POST` em JSON vindo do próprio domínio (checagem de `Origin`).
- Token assinado pelo servidor (HMAC) com idade mínima e máxima, + campo-armadilha invisível.
- Limite de 5 mensagens a cada 10 minutos por IP e 50 por dia.
- Validação e limite de tamanho em todos os campos; HTML escapado no e-mail; sem quebras
  de linha nos cabeçalhos.
- `netlify.toml` aplica Content-Security-Policy restritiva, HSTS e outros cabeçalhos.
