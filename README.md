# BiblioTech — site de demonstração

Site estático em HTML, CSS e JavaScript para testar a API BiblioTech hospedada no Render. O site e a API são projetos separados: esta pasta será publicada no GitHub Pages, e as requisições do navegador vão para a API.

A interface usa azul-marinho, azul-turquesa e fonte Poppins, com telas simples para consultar e administrar os cadastros.

## Acesso

- Visitantes podem consultar os livros e cadastrar uma conta de leitor.
- Contas **MEMBRO BASE** podem consultar livros, autores, categorias e leitores. Não podem cadastrar, editar ou remover registros.
- Contas **MEMBRO PREMIUM** podem consultar, cadastrar, editar e remover livros, autores, categorias e leitores.
- Contas com perfil **ADMIN** têm acesso completo a todos os recursos.
- Para entrar, use o e-mail e a senha do leitor. O perfil e o plano aparecem ao lado do botão de saída. A API é quem valida as permissões.
- O formulário de livro inclui a quantidade de exemplares; zero é permitido.

## Publicar no GitHub Pages

1. Abra o repositório `VictorZampella/bibliotech-site` no GitHub.
2. Substitua na raiz os arquivos `index.html`, `styles.css`, `app.js` e `README.md` pelos desta pasta.
3. Faça commit das alterações.
4. Aguarde o GitHub Pages publicar a nova versão. A configuração existente usa a branch `main` e a pasta `/(root)`.
5. Abra [victorzampella.github.io/bibliotech-site](https://victorzampella.github.io/bibliotech-site/).

O repositório do site é separado do repositório da API. Não altere nem mova o projeto Spring Boot para publicar esta página: ela apenas chama a API que continua no Render.

O endereço inicial da API está configurado no começo de `app.js`. Ele também pode ser alterado pelo rodapé da lista no próprio site.

## O que o site permite testar

- Consultar e pesquisar os livros, navegar pelas páginas e alternar entre as respostas v1 e v2.
- Fazer login para ver o papel e plano da conta; a chave fica apenas na memória desta página e é revogada ao sair.
- Com uma conta ADMIN ou MEMBRO PREMIUM, listar, cadastrar, consultar, atualizar e remover livros, autores, categorias e leitores.
- Com uma conta MEMBRO BASE, consultar livros, autores, categorias e leitores, sem permissão para alterar ou remover dados.
- Sem entrar, cadastrar uma conta de leitor. Depois, entre com a conta criada para consultar os dados permitidos pelo perfil.
- Enviar `X-Idempotency-Key` nos cadastros. Se uma tentativa falhar e for repetida sem mudar os dados, o site reutiliza a mesma chave.
- Exibir o código HTTP e a mensagem retornada pela API. Se uma categoria estiver vinculada a um livro, a API informa o conflito (409); ao atingir o limite, mostra o tempo de espera retornado em `Retry-After`.

Para cadastrar um livro, entre com uma conta ADMIN ou MEMBRO PREMIUM e selecione autor e categoria já cadastrados. Uma categoria vinculada a livros não pode ser removida até que esses livros sejam atualizados ou removidos. O cadastro de leitores consulta o ViaCEP pela própria API. A API também valida as permissões, então ocultar os botões no site não substitui a autorização do servidor. A chave de acesso fica somente na memória da página e é revogada ao sair.

## Endereços da API

- API: `https://bibliotech-spring-boot-1.onrender.com/api`
- Documentação: `https://bibliotech-spring-boot-1.onrender.com/swagger-ui/index.html`
