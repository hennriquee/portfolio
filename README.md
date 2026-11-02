# Portfólio — Bruno Henrique

Site pessoal (desenvolvimento, dados e BI) feito com HTML, CSS e JavaScript puros,
animação 3D em **Three.js**, efeitos de rolagem com **GSAP + ScrollTrigger** e rolagem
suave com **Lenis**. Em português, inglês e espanhol, com tema escuro e claro.
Não precisa de etapa de build. Publicado na **Netlify**.

## Estrutura

```
├── public/                       # tudo o que vai para o ar
│   ├── index.html                # conteúdo em português (marcado com data-i18n)
│   └── assets/
│       ├── css/
│       │   ├── theme.css         # 🎨 cores dos temas escuro/claro, fontes e medidas
│       │   └── main.css          # layout, componentes e seções
│       ├── js/
│       │   ├── boot.js           # roda no <head>: tema e idioma antes de pintar a tela
│       │   ├── config.js         # 📞 WhatsApp, e-mail e endpoint do formulário
│       │   ├── main.js           # ponto de entrada
│       │   ├── i18n/             # 🌐 traduções: pt.js (mensagens do JS), en.js, es.js
│       │   └── modules/          # um arquivo por funcionalidade
│       ├── img/
│       │   ├── tech-icons.svg    # logos das tecnologias
│       │   └── projects/         # imagens dos projetos e da apresentação em PDF
│       ├── docs/                 # currículo em PDF
│       └── vendor/               # bibliotecas hospedadas localmente
├── netlify/functions/contact.mjs # função que envia o e-mail (/api/contact)
├── resume/curriculo.html         # fonte do currículo em PDF (não vai para o ar)
├── netlify.toml                  # pasta publicada + cabeçalhos de segurança
└── .env.example                  # variáveis do envio de e-mail
```

## Personalizar

**Trocar a cor do site** — em `public/assets/css/theme.css`, altere só `--brand`. Fundo,
destaques, brilhos e a animação 3D dos dois temas são calculados a partir dela.
Alguns itens são fixos e precisam ser trocados à mão se a cor mudar: as cores de
`theme-color` (`index.html` e `modules/theme.js`), as cores do e-mail em
`netlify/functions/contact.mjs`, o currículo (`resume/curriculo.html`) e as imagens
`og-image.jpg` / fundo da foto.

**Textos e idiomas** — o português fica direto no `index.html`. Cada texto traduzível tem
`data-i18n="chave"`; a mesma chave existe em `public/assets/js/i18n/en.js` e `es.js`.
Ao mudar um texto em português, atualize também as duas traduções.
O visitante escolhe o idioma no topo (ou no menu do celular). Na primeira visita o site
usa o idioma do navegador. Para mandar o link já em inglês: `seusite.netlify.app/?lang=en`.

**Tema** — escuro por padrão; o botão de sol/lua troca para o claro e a escolha fica salva.

**WhatsApp e e-mail** — em `public/assets/js/config.js` (os links no HTML são só a versão
para quem estiver sem JavaScript). As mensagens prontas do WhatsApp ficam nos arquivos
de tradução (`wa.msg`, `wa.service`).

**Logos das tecnologias** — use `data-tech="nome"` em um chip (ex.: `<li class="chip" data-tech="react">React</li>`).
Os nomes disponíveis estão em `assets/img/tech-icons.svg` (`id="t-nome"`). Para tecnologias sem
logo, use um ícone de linha do `index.html`, como `data-tech="i-database"`.
Os logos vêm das coleções livres do Iconify (logos e simple-icons: CC0; devicon e vscode-icons: MIT).

**Projetos** — em `index.html`, seção `PROJETOS`. Copie um `<article class="project card">`,
troque o link, os textos e as imagens (`assets/img/projects/NOME-960.webp` e `NOME-640.webp`, 16:10).

**Serviços** — seção `SERVIÇOS`. O botão "Pedir orçamento" abre o WhatsApp citando o título do card.

**Experiências** — seção `EXPERIÊNCIA`. Copie um `<li class="tl-item">` e ajuste
`data-start="AAAA-MM"` / `data-end="AAAA-MM"` (vazio = emprego atual). O período e a duração
são gerados sozinhos, no idioma escolhido. Os números da seção "Sobre" também são automáticos.

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
(escopo: *Functions* ou *All scopes*):

| Variável | O que é |
| --- | --- |
| `SMTP_USER` | o Gmail que envia as mensagens |
| `SMTP_PASS` | uma **senha de app** do Google ([myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — exige verificação em duas etapas) |
| `MAIL_TO` | onde você quer receber (pode ser o mesmo e-mail) |
| `CONTACT_SECRET` | texto aleatório longo para assinar os tokens anti-robô |

Gere o `CONTACT_SECRET` com:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Depois de salvar as variáveis, faça um novo deploy** (Deploys → Trigger deploy → Deploy site):
a função só enxerga variáveis novas depois disso. Para conferir, abra
`https://seusite.netlify.app/api/contact` — deve aparecer `"ok":true` com um token.
Se aparecer `"Envio indisponível"`, as variáveis ainda não chegaram à função.

Enquanto o envio não estiver configurado, o formulário continua funcionando como atalho:
mostra os botões de WhatsApp e e-mail já preenchidos.

> Dica: com o domínio definido, troque `og:image` no `index.html` por uma URL completa
> (ex.: `https://seusite.netlify.app/assets/img/og-image.jpg`) para a prévia aparecer
> no WhatsApp e no LinkedIn.

### Segurança do formulário

- Nenhuma credencial vai para o navegador: tudo fica nas variáveis de ambiente da Netlify.
- Sem serviço de terceiros: a função envia direto pelo seu e-mail.
- Aceita apenas `POST` em JSON vindo do próprio domínio (checagem de `Origin`).
- Token assinado pelo servidor (HMAC) com idade mínima e máxima, + campo-armadilha invisível.
- Limite de 5 mensagens a cada 10 minutos por IP e 50 por dia.
- Validação e limite de tamanho em todos os campos; HTML escapado no e-mail; sem quebras
  de linha nos cabeçalhos.
- `netlify.toml` aplica Content-Security-Policy restritiva, HSTS e outros cabeçalhos.
