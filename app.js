const API_ORIGINAL = 'https://bibliotech-spring-boot-1.onrender.com';
const API_STORAGE_KEY = 'bibliotech-api-url';

const resources = {
  livros: {
    title: 'Livros', endpoint: '/api/livros', singular: 'livro', item: 'livro',
    description: 'Consulte e administre as obras cadastradas na biblioteca.',
    help: 'Pesquise pelo título, descrição, autor ou categoria.',
    columns: [
      { label: 'Obra', value: item => item.titulo, sub: item => item.autor?.nome || item.autorNome || 'Autor não informado' },
      { label: 'Categoria', value: item => item.categoria?.nome || item.categoriaNome || '—' },
      { label: 'Páginas', value: item => item.quantidadePaginas ?? '—' },
      { label: 'Exemplares', value: item => item.quantidadeExemplares ?? 0 },
      { label: 'Preço', value: item => dinheiro(item.preco) }
    ],
    fields: [
      { name: 'titulo', label: 'Título', required: true, min: 2, max: 160, placeholder: 'Ex.: Duna' },
      { name: 'autorId', label: 'Autor cadastrado', type: 'select', required: true, source: 'autores', display: 'nome' },
      { name: 'categoriaId', label: 'Categoria cadastrada', type: 'select', required: true, source: 'categorias', display: 'nome' },
      { name: 'descricaoCurta', label: 'Descrição curta', type: 'textarea', required: true, min: 20, max: 300, full: true, hint: 'De 20 a 300 caracteres.' },
      { name: 'descricaoLonga', label: 'Descrição completa', type: 'textarea', required: true, min: 50, max: 10000, full: true, hint: 'De 50 a 10.000 caracteres.' },
      { name: 'urlCapa', label: 'URL da capa', type: 'url', required: true, max: 1500, full: true, placeholder: 'https://exemplo.com/capa.jpg' },
      { name: 'preco', label: 'Preço (R$)', type: 'number', required: true, min: 0, step: '0.01', placeholder: '39,90' },
      { name: 'quantidadePaginas', label: 'Páginas', type: 'number', required: true, min: 1, max: 10000, step: '1' },
      { name: 'quantidadeExemplares', label: 'Exemplares disponíveis', type: 'number', required: true, min: 0, max: 100000, step: '1', hint: 'Use 0 se o livro estiver sem exemplares disponíveis.' },
      { name: 'anoPublicacao', label: 'Data de publicação', type: 'date', required: true, max: hojeIso() }
    ]
  },
  autores: {
    title: 'Autores', endpoint: '/api/autores', singular: 'autor', item: 'autor',
    description: 'Consulte os autores vinculados aos livros do catálogo.',
    help: 'Os autores cadastrados podem ser vinculados aos livros.',
    columns: [
      { label: 'Autor', value: item => item.nome },
      { label: 'Nacionalidade', value: item => item.nacionalidade || '—' },
      { label: 'Nascimento', value: item => dataCurta(item.dataNascimento) },
      { label: 'Biografia', value: item => cortar(item.biografia, 72) }
    ],
    fields: [
      { name: 'nome', label: 'Nome completo', required: true, min: 2, max: 100 },
      { name: 'nacionalidade', label: 'Nacionalidade', required: true, min: 2, max: 60 },
      { name: 'dataNascimento', label: 'Data de nascimento', type: 'date', required: true, max: ontemIso() },
      { name: 'urlFoto', label: 'URL da foto', type: 'url', required: true, max: 1500, full: true, placeholder: 'https://exemplo.com/foto.jpg' },
      { name: 'biografia', label: 'Biografia', type: 'textarea', required: true, min: 30, max: 1500, full: true, hint: 'De 30 a 1.500 caracteres.' }
    ]
  },
  categorias: {
    title: 'Categorias', endpoint: '/api/categorias', singular: 'categoria', item: 'categoria',
    description: 'Consulte as categorias usadas para organizar os livros.',
    help: 'O nome da categoria deve ser exclusivo.',
    columns: [
      { label: 'Categoria', value: item => item.nome },
      { label: 'Identificador', value: item => item.id, mono: true }
    ],
    fields: [{ name: 'nome', label: 'Nome da categoria', required: true, min: 3, max: 60, placeholder: 'Ex.: Ficção científica' }]
  },
  usuarios: {
    title: 'Leitores', endpoint: '/api/usuarios', singular: 'leitor', item: 'leitor',
    description: 'Consulte os leitores cadastrados ou crie uma conta para acessar a API.',
    help: 'O endereço é completado pela API a partir do CEP informado.',
    columns: [
      { label: 'Leitor', value: item => item.nome, sub: item => item.email },
      { label: 'Telefone', value: item => item.telefone || '—' },
      { label: 'Cidade', value: item => item.endereco?.localidade || '—' },
      { label: 'CEP', value: item => item.endereco?.cep || '—' }
    ],
    fields: [
      { name: 'nome', label: 'Nome completo', required: true, min: 3, max: 100 },
      { name: 'email', label: 'E-mail', type: 'email', required: true, max: 254 },
      { name: 'telefone', label: 'Telefone', required: true, max: 15, placeholder: '(11) 99999-1234', hint: 'Use (11) 99999-1234 ou (11) 3333-4444.' },
      { name: 'senha', label: 'Senha', type: 'password', required: true, min: 8, max: 100, hint: 'Mínimo de 8 caracteres, sem espaços.' },
      { name: 'dataNascimento', label: 'Data de nascimento', type: 'date', required: true, max: ontemIso() },
      { name: 'cep', label: 'CEP', inputmode: 'numeric', required: true, min: 8, max: 8, pattern: '[0-9]{8}', placeholder: '01001000', hint: 'Digite os 8 números, sem hífen.' }
    ]
  }
};

let apiBase = (localStorage.getItem(API_STORAGE_KEY) || API_ORIGINAL).replace(/\/+$/, '');
let activeResource = 'livros';
let records = [];
let currentPage = 0;
let totalPages = 1;
let authKey = '';
let authRole = '';
let authPlan = '';
let editingRecord = null;
let pendingCreateSignature = '';
let pendingCreateKey = '';
let toastTimer;
let searchTimer;

const $ = selector => document.querySelector(selector);
const ui = {
  statusDot: $('#statusDot'), apiStatus: $('#apiStatus'),
  pageTitle: $('#pageTitle'), pageDescription: $('#pageDescription'), breadcrumb: $('#breadcrumbCurrent'),
  createButton: $('#createButton'), emptyCreateButton: $('#emptyCreateButton'),
  listTitle: $('#listTitle'), listHelp: $('#listHelp'), search: $('#searchInput'),
  tableHead: $('#tableHead'), tableBody: $('#tableBody'), tableWrap: $('#tableWrap'),
  emptyState: $('#emptyState'), loadingState: $('#loadingState'), emptyTitle: $('#emptyTitle'),
  emptyCopy: $('#emptyCopy'), resultCount: $('#resultCount'), versionWrap: $('#versionPickerWrap'),
  versionPicker: $('#versionPicker'), formDialog: $('#formDialog'), form: $('#resourceForm'),
  formFields: $('#formFields'), formTitle: $('#formTitle'), formDescription: $('#formDescription'),
  formMessage: $('#formMessage'), saveButton: $('#saveButton'), loginDialog: $('#loginDialog'),
  loginForm: $('#loginForm'), loginMessage: $('#loginMessage'), loginButton: $('#loginButton'),
  logoutButton: $('#logoutButton'), authChip: $('#authChip'), detailDialog: $('#detailDialog'),
  detailTitle: $('#detailTitle'), detailBody: $('#detailBody'), toast: $('#toast')
};

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function ontemIso() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function cortar(value, limit) {
  const text = String(value || '');
  return text.length > limit ? `${text.slice(0, limit)}…` : text || '—';
}

function dinheiro(value) {
  const price = Number(value);
  return Number.isFinite(price) ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
}

function dataCurta(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

function collectionItems(data) {
  const embedded = data?._embedded || {};
  const collection = Object.values(embedded).find(Array.isArray);
  return collection || data?.content || (Array.isArray(data) ? data : []);
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/hal+json, application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (authKey) headers.set('X-API-Key', authKey);

  let response;
  try {
    response = await fetch(`${apiBase}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Não consegui alcançar a API em ${apiBase}. Confira o endereço e se o serviço está ativo.`);
  }

  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = raw; }
  }
  if (!response.ok) {
    const messages = Array.isArray(data?.errors) ? data.errors.join(' ') : '';
    if (response.status === 401 && authKey) {
      authKey = '';
      authRole = '';
      authPlan = '';
      atualizarEstadoLogin();
    }
    const detalhe = messages || data?.message || data?.error || 'Confira os dados e as permissões da conta.';
    const aguardo = response.status === 429 && response.headers.get('Retry-After') && !detalhe.includes('Retry-After')
      ? ` Aguarde ${response.headers.get('Retry-After')} segundo(s), conforme Retry-After.`
      : '';
    const error = new Error(`HTTP ${response.status}: ${detalhe}${aguardo}`);
    error.status = response.status;
    throw error;
  }
  return { data, response };
}

async function apiEstaAcessivel() {
  try {
    const resposta = await fetch(`${apiBase}/api/livros?page=0&size=1`, {
      headers: { Accept: 'application/hal+json, application/json' }
    });
    return resposta.ok;
  } catch {
    return false;
  }
}

async function carregarLista(resourceKey = activeResource, termo = '', page = currentPage) {
  const config = resources[resourceKey];
  ui.loadingState.hidden = false;
  ui.tableWrap.hidden = true;
  ui.emptyState.hidden = true;
  try {
    currentPage = page;
    let path = `${config.endpoint}?page=${page}&size=20`;
    if (resourceKey === 'livros' && termo.trim()) {
      path = `${config.endpoint}/pesquisa?termo=${encodeURIComponent(termo.trim())}&page=${page}&size=20`;
    }
    const { data } = await apiRequest(path);
    records = collectionItems(data);
    totalPages = Math.max(1, data?.page?.totalPages ?? data?.totalPages ?? 1);
    if (termo.trim() && resourceKey !== 'livros') {
      const query = termo.trim().toLocaleLowerCase('pt-BR');
      records = records.filter(record => JSON.stringify(record).toLocaleLowerCase('pt-BR').includes(query));
    }
    renderList(config, records);
    setApiStatus(true, 'API conectada');
    updateCounts(resourceKey, records, data?.page?.totalElements);
    atualizarPaginacao();
  } catch (error) {
    records = [];
    totalPages = 1;
    currentPage = 0;
    renderList(config, []);
    atualizarPaginacao();
    if (error.status === 401 || error.status === 403) {
      setApiStatus(true, 'API conectada · acesso restrito');
      ui.emptyTitle.textContent = 'Entre para consultar este cadastro';
      ui.emptyCopy.textContent = authKey
        ? `Seu perfil ${authRole || 'MEMBRO'} · plano ${authPlan || 'BASE'} não tem acesso a esta consulta.`
        : 'Entre com sua conta de leitor para consultar esta lista.';
      ui.emptyCreateButton.hidden = true;
    } else if (error.status) {
      setApiStatus(true, error.status === 429 ? 'API conectada · limite atingido' : 'API respondeu com erro');
    } else if (await apiEstaAcessivel()) {
      setApiStatus(true, authKey ? 'API conectada · confira sua chave' : 'API conectada · login necessário');
      ui.emptyTitle.textContent = authKey ? 'Não foi possível carregar esta lista' : 'Entre para consultar este cadastro';
      ui.emptyCopy.textContent = authKey
        ? 'A API está online, mas não foi possível concluir esta consulta. Confira sua chave e tente novamente.'
        : `A API está online. Entre com sua conta para consultar ${config.title.toLocaleLowerCase('pt-BR')}.`;
      ui.emptyCreateButton.hidden = true;
      showToast(authKey
        ? 'A API está online, mas não foi possível validar a chave desta consulta.'
        : `A API está online. Entre para consultar ${config.title.toLocaleLowerCase('pt-BR')}.`, Boolean(authKey));
    } else {
      setApiStatus(false, 'Falha ao conectar');
      showToast(error.message, true);
    }
  } finally {
    ui.loadingState.hidden = true;
  }
}

function renderList(config, items) {
  const podeGerenciar = podeAdministrar();
  ui.tableHead.innerHTML = `<tr>${config.columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')}<th class="actions-heading">Ações</th></tr>`;
  ui.tableBody.innerHTML = items.map(item => {
    const cells = config.columns.map((column, index) => {
      const value = column.value(item);
      const sub = column.sub ? column.sub(item) : '';
      return `<td class="${index === 0 ? 'primary-cell' : ''} ${column.mono ? 'mono-cell' : ''}">${escapeHtml(value)}${sub ? `<span class="cell-sub">${escapeHtml(sub)}</span>` : ''}</td>`;
    }).join('');
    return `<tr data-id="${escapeHtml(item.id)}">${cells}<td><div class="row-actions">
      <button class="text-action" data-action="detail" data-id="${escapeHtml(item.id)}">Ver</button>
      ${podeGerenciar ? `<button class="text-action" data-action="edit" data-id="${escapeHtml(item.id)}">Editar</button>
      <button class="text-action danger" data-action="delete" data-id="${escapeHtml(item.id)}">Remover</button>` : ''}
    </div></td></tr>`;
  }).join('');
  ui.tableWrap.hidden = items.length === 0;
  ui.emptyState.hidden = items.length > 0;
  ui.emptyTitle.textContent = ui.search.value.trim() ? 'Nenhum resultado encontrado' : `Nenhum ${config.singular} cadastrado`;
  ui.emptyCopy.textContent = ui.search.value.trim()
    ? 'Tente buscar por outro termo.'
    : `Quando você cadastrar ${config.singular === 'livro' ? 'um livro' : config.singular === 'categoria' ? 'uma categoria' : config.singular === 'autor' ? 'um autor' : 'um leitor'}, ele aparecerá aqui.`;
  ui.resultCount.textContent = `${items.length} ${items.length === 1 ? 'registro' : 'registros'} nesta página`;
}

function atualizarPaginacao() {
  const previous = $('#previousPage');
  const next = $('#nextPage');
  const indicator = $('#pageIndicator');
  if (!previous || !next || !indicator) return;
  indicator.textContent = `Página ${currentPage + 1} de ${totalPages}`;
  previous.disabled = currentPage <= 0;
  next.disabled = currentPage >= totalPages - 1;
}

function updateCounts(resourceKey, items, total) {
  const key = `count${resourceKey[0].toUpperCase()}${resourceKey.slice(1)}`;
  const element = document.getElementById(key);
  if (element) element.textContent = total ?? items.length;
}

function setApiStatus(online, label) {
  ui.statusDot.className = `status-dot ${online ? 'online' : 'offline'}`;
  ui.apiStatus.textContent = label;
}

function showToast(message, error = false) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.className = `toast show${error ? ' error' : ''}`;
  toastTimer = setTimeout(() => { ui.toast.className = 'toast'; }, 4200);
}

function setResource(resourceKey) {
  activeResource = resourceKey;
  const config = resources[resourceKey];
  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.resource === resourceKey);
  });
  ui.pageTitle.textContent = config.title;
  ui.breadcrumb.textContent = config.title;
  ui.pageDescription.textContent = config.description;
  ui.listTitle.textContent = resourceKey === 'livros' ? 'Acervo de livros' : `Lista de ${config.title.toLocaleLowerCase('pt-BR')}`;
  ui.listHelp.textContent = config.help;
  ui.search.placeholder = resourceKey === 'livros' ? 'Buscar no catálogo' : `Buscar ${config.title.toLocaleLowerCase('pt-BR')}`;
  ui.search.value = '';
  currentPage = 0;
  ui.createButton.innerHTML = `<span aria-hidden="true">＋</span> Novo ${config.singular}`;
  ui.emptyCreateButton.textContent = `Cadastrar ${config.singular === 'livro' ? 'primeiro livro' : `primeiro ${config.singular}`}`;
  ui.versionWrap.hidden = resourceKey !== 'livros';
  atualizarEstadoLogin();
  carregarLista(resourceKey);
}

function podeAdministrar() {
  return Boolean(authKey && (authRole === 'ADMIN' || (authRole === 'MEMBRO' && authPlan === 'PREMIUM')));
}

function pedirPermissaoDeGestao() {
  if (podeAdministrar()) return true;
  if (authKey) {
    showToast('Esta ação exige um plano PREMIUM ou perfil ADMIN.', true);
  } else {
    ui.loginDialog.showModal();
    showToast('Entre com uma conta PREMIUM ou ADMIN para cadastrar, editar ou remover dados.', true);
  }
  return false;
}

function iniciarCadastro() {
  if (activeResource === 'usuarios' && !authKey) {
    abrirFormulario('create');
    return;
  }
  if (pedirPermissaoDeGestao()) abrirFormulario('create');
}

function createField(field, record) {
  const currentValue = field.name === 'autorId' ? record?.autor?.id
    : field.name === 'categoriaId' ? record?.categoria?.id
      : field.name === 'cep' ? record?.endereco?.cep
        : record?.[field.name];
  const type = field.type || 'text';
  const attributes = [
    `name="${escapeHtml(field.name)}"`, `type="${escapeHtml(type)}"`,
    field.required ? 'required' : '',
    field.min !== undefined && type !== 'date' && type !== 'number' ? `minlength="${field.min}"` : '',
    field.max !== undefined && type !== 'date' && type !== 'number' ? `maxlength="${field.max}"` : '',
    field.min !== undefined && type === 'number' ? `min="${field.min}"` : '',
    field.max !== undefined && type === 'number' ? `max="${field.max}"` : '',
    field.step ? `step="${field.step}"` : '',
    field.pattern ? `pattern="${field.pattern}"` : '',
    field.max && type === 'date' ? `max="${field.max}"` : '',
    field.inputmode ? `inputmode="${field.inputmode}"` : '',
    field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '',
    type === 'url' ? 'pattern="https?://.+"' : ''
  ].filter(Boolean).join(' ');

  let input;
  if (field.type === 'textarea') {
    input = `<textarea ${attributes}>${escapeHtml(currentValue)}</textarea>`;
  } else if (field.type === 'select') {
    const source = cache[field.source] || [];
    input = `<select ${attributes}><option value="">Selecione ${escapeHtml(field.label.toLocaleLowerCase('pt-BR'))}</option>${source.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === currentValue ? 'selected' : ''}>${escapeHtml(item[field.display])}</option>`).join('')}</select>`;
  } else {
    const value = type === 'date' ? String(currentValue || '').slice(0, 10)
      : type === 'number' && currentValue != null ? currentValue : currentValue || '';
    input = `<input ${attributes} value="${escapeHtml(value)}" autocomplete="${type === 'password' ? 'new-password' : 'off'}">`;
  }
  return `<label class="field ${field.full ? 'full' : ''}"><span>${escapeHtml(field.label)}</span>${input}${field.hint ? `<small class="field-hint">${escapeHtml(field.hint)}</small>` : ''}</label>`;
}

const cache = { autores: [], categorias: [] };

async function carregarOpcoesDeLivro() {
  const requests = ['autores', 'categorias'].map(async key => {
    const { data } = await apiRequest(`${resources[key].endpoint}?page=0&size=100`);
    cache[key] = collectionItems(data);
  });
  await Promise.all(requests);
}

async function abrirFormulario(mode, record = null) {
  const config = resources[activeResource];
  editingRecord = record;
  ui.formTitle.textContent = mode === 'edit' ? `Editar ${config.singular}` : `Novo ${config.singular}`;
  ui.formDescription.textContent = mode === 'edit'
    ? `Atualize os dados abaixo. O identificador do cadastro será mantido.`
    : activeResource === 'livros'
      ? 'Selecione um autor e uma categoria que já estejam cadastrados. O livro recebe seu próprio UUID ao ser criado.'
      : activeResource === 'usuarios'
        ? 'A API consulta o ViaCEP para preencher o endereço a partir dos oito números do CEP.'
        : 'Preencha os campos obrigatórios para enviar o cadastro à API.';
  ui.formMessage.hidden = true;
  ui.formFields.innerHTML = '<div class="loading-inline"><span class="spinner"></span> Preparando formulário…</div>';
  ui.saveButton.textContent = mode === 'edit' ? 'Salvar alterações' : 'Cadastrar';
  ui.formDialog.showModal();
  try {
    if (activeResource === 'livros') await carregarOpcoesDeLivro();
    ui.formFields.innerHTML = config.fields.map(field => createField(field, record)).join('');
  } catch (error) {
    ui.formFields.innerHTML = '';
    mostrarMensagemFormulario(error.message);
  }
}

function montarCorpo(resourceKey, formData) {
  const config = resources[resourceKey];
  const body = {};
  for (const field of config.fields) {
    const value = String(formData.get(field.name) || '').trim();
    if (field.name === 'autorId' || field.name === 'categoriaId') continue;
    if (field.name === 'cep') continue;
    if (field.name === 'dataNascimento' && resourceKey === 'usuarios') {
      body.dataNascimento = `${value}T00:00:00.000Z`;
    } else if (field.name === 'preco') {
      body.preco = Number(value);
    } else if (field.name === 'quantidadePaginas') {
      body.quantidadePaginas = Number.parseInt(value, 10);
    } else if (field.name === 'quantidadeExemplares') {
      body.quantidadeExemplares = Number.parseInt(value, 10);
    } else {
      body[field.name] = value;
    }
  }
  if (resourceKey === 'livros') {
    body.autor = { id: formData.get('autorId') };
    body.categoria = { id: formData.get('categoriaId') };
  }
  if (resourceKey === 'usuarios') body.endereco = { cep: String(formData.get('cep') || '').trim() };
  return body;
}

function mostrarMensagemFormulario(message, success = false) {
  ui.formMessage.textContent = message;
  ui.formMessage.className = `form-message${success ? ' success' : ''}`;
  ui.formMessage.hidden = false;
}

function idempotencyKey() {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${activeResource}-${value}`;
}

async function salvarCadastro(event) {
  event.preventDefault();
  if (!ui.form.reportValidity()) return;
  const cadastroPublicoDeLeitor = activeResource === 'usuarios' && !editingRecord && !authKey;
  if (!cadastroPublicoDeLeitor && !pedirPermissaoDeGestao()) {
    return;
  }
  const config = resources[activeResource];
  const body = montarCorpo(activeResource, new FormData(ui.form));
  const isEdit = Boolean(editingRecord);
  const path = isEdit ? `${config.endpoint}/${encodeURIComponent(editingRecord.id)}` : config.endpoint;
  const assinatura = `${activeResource}:${JSON.stringify(body)}`;
  if (!isEdit && assinatura !== pendingCreateSignature) {
    pendingCreateSignature = assinatura;
    pendingCreateKey = idempotencyKey();
  }
  const headers = isEdit ? {} : { 'X-Idempotency-Key': pendingCreateKey };
  ui.saveButton.disabled = true;
  ui.saveButton.textContent = isEdit ? 'Atualizando…' : 'Enviando…';
  ui.formMessage.hidden = true;
  try {
    const { data } = await apiRequest(path, { method: isEdit ? 'PUT' : 'POST', headers, body: JSON.stringify(body) });
    pendingCreateSignature = '';
    pendingCreateKey = '';
    const label = body.titulo || body.nome || body.email || 'Cadastro';
    ui.formDialog.close();
    showToast(`${label} ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso.`);
    if (podeAdministrar()) {
      await Promise.all([carregarLista(activeResource, ui.search.value, 0), atualizarResumo()]);
    } else {
      showToast('Leitor cadastrado. Entre com essa conta para consultar os dados permitidos pelo perfil.');
    }
  } catch (error) {
    mostrarMensagemFormulario(error.message);
  } finally {
    ui.saveButton.disabled = false;
    ui.saveButton.textContent = isEdit ? 'Salvar alterações' : 'Cadastrar';
  }
}

async function abrirDetalhes(id) {
  const config = resources[activeResource];
  const version = activeResource === 'livros' ? ui.versionPicker.value : '1';
  const headers = activeResource === 'livros' ? { 'X-API-Version': version } : {};
  try {
    const { data, response } = await apiRequest(`${config.endpoint}/${encodeURIComponent(id)}`, { headers });
    ui.detailTitle.textContent = `${config.singular[0].toUpperCase()}${config.singular.slice(1)} · versão ${version}`;
    const safeJson = escapeHtml(JSON.stringify(data, null, 2));
    const location = response.headers.get('Location');
    const replay = response.headers.get('Idempotency-Replayed');
    ui.detailBody.innerHTML = `${location ? `<p class="response-meta">Local do cadastro: <code>${escapeHtml(location)}</code></p>` : ''}${replay ? `<p class="response-meta">Resposta repetida: ${escapeHtml(replay)}</p>` : ''}<pre>${safeJson}</pre>`;
    ui.detailDialog.showModal();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function removerCadastro(id) {
  const config = resources[activeResource];
  if (!pedirPermissaoDeGestao()) return;
  const item = records.find(record => record.id === id);
  const label = item?.titulo || item?.nome || item?.email || 'este cadastro';
  if (!window.confirm(`Deseja remover “${label}”? Essa ação não pode ser desfeita.`)) return;
  try {
    await apiRequest(`${config.endpoint}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    showToast(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} removido com sucesso.`);
    await Promise.all([carregarLista(activeResource, ui.search.value, currentPage), atualizarResumo()]);
  } catch (error) {
    showToast(error.message, true);
  }
}

async function entrar(event) {
  event.preventDefault();
  if (!ui.loginForm.reportValidity()) return;
  const values = new FormData(ui.loginForm);
  const body = { email: values.get('email'), senha: values.get('senha') };
  const submit = $('#loginSubmit');
  submit.disabled = true;
  submit.textContent = 'Entrando…';
  ui.loginMessage.hidden = true;
  try {
    const { data } = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
    authKey = data.apiKey;
    authRole = data.papel || '';
    authPlan = data.plano || '';
    ui.loginDialog.close();
    ui.loginForm.reset();
    atualizarEstadoLogin();
    const podeGerenciar = podeAdministrar();
    const perfil = authRole === 'ADMIN' ? 'Admin' : `Membro ${authPlan || 'BASE'}`;
    const acesso = podeGerenciar ? 'pode consultar, cadastrar, editar e remover os registros' : 'pode consultar livros, autores, categorias e leitores';
    showToast(`Olá, ${data.nome}. ${perfil}: você ${acesso}.`);
    await Promise.all([carregarLista(activeResource, ui.search.value, 0), atualizarResumo()]);
  } catch (error) {
    ui.loginMessage.textContent = error.message;
    ui.loginMessage.hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = 'Entrar';
  }
}

function atualizarEstadoLogin() {
  const autorizado = Boolean(authKey);
  ui.loginButton.hidden = autorizado;
  ui.logoutButton.hidden = !autorizado;
  ui.authChip.hidden = !autorizado;
  ui.authChip.textContent = autorizado ? `${authRole || 'MEMBRO'} · ${authPlan || 'BASE'}` : 'Sem chave';
  const podeCriar = podeAdministrar() || (activeResource === 'usuarios' && !autorizado);
  ui.createButton.hidden = !podeCriar;
  ui.emptyCreateButton.hidden = !podeCriar;
}

async function sair() {
  if (!authKey) return;
  try {
    await apiRequest('/api/auth/logout', { method: 'POST', headers: { 'X-API-Key': authKey } });
    showToast('Você saiu e a chave foi revogada.');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    authKey = '';
    authRole = '';
    authPlan = '';
    atualizarEstadoLogin();
    carregarLista(activeResource, ui.search.value, 0);
    atualizarResumo();
  }
}

async function atualizarResumo() {
  const keys = ['livros', 'autores', 'categorias', 'usuarios'];
  await Promise.all(keys.map(async key => {
    try {
      const { data } = await apiRequest(`${resources[key].endpoint}?page=0&size=1`);
      updateCounts(key, collectionItems(data), data?.page?.totalElements);
    } catch {
      const element = document.getElementById(`count${key[0].toUpperCase()}${key.slice(1)}`);
      if (element) element.textContent = '—';
    }
  }));
}

function lerBaseDaApi() {
  const entry = window.prompt('Endereço base da API. Exemplo: https://bibliotech-spring-boot-1.onrender.com', apiBase);
  if (entry === null) return;
  const cleaned = entry.trim().replace(/\/+$/, '');
  try {
    const url = new URL(cleaned);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
    apiBase = cleaned;
    localStorage.setItem(API_STORAGE_KEY, apiBase);
    showToast('Endereço da API atualizado. Testando conexão…');
    carregarLista(activeResource, ui.search.value);
    atualizarResumo();
  } catch {
    showToast('Informe um endereço válido começando com https:// ou http://.', true);
  }
}

document.querySelectorAll('.nav-item').forEach(button => {
  button.addEventListener('click', () => setResource(button.dataset.resource));
});

ui.createButton.addEventListener('click', iniciarCadastro);
ui.emptyCreateButton.addEventListener('click', iniciarCadastro);
$('#refreshButton').addEventListener('click', () => {
  carregarLista(activeResource, ui.search.value);
  atualizarResumo();
});
$('#dataSource').addEventListener('click', lerBaseDaApi);
$('#dataSource').title = 'Clique para alterar o endereço da API';
$('#dataSource').tabIndex = 0;
$('#dataSource').role = 'button';
$('#dataSource').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') lerBaseDaApi();
});
ui.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  currentPage = 0;
  searchTimer = setTimeout(() => carregarLista(activeResource, ui.search.value, 0), 300);
});
$('#previousPage').addEventListener('click', () => {
  if (currentPage > 0) carregarLista(activeResource, ui.search.value, currentPage - 1);
});
$('#nextPage').addEventListener('click', () => {
  if (currentPage + 1 < totalPages) carregarLista(activeResource, ui.search.value, currentPage + 1);
});
ui.versionPicker.addEventListener('change', () => showToast(`Detalhes dos livros serão consultados na versão ${ui.versionPicker.value}.`));
ui.tableBody.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'detail') abrirDetalhes(id);
  if (action === 'edit' && pedirPermissaoDeGestao()) abrirFormulario('edit', records.find(record => record.id === id));
  if (action === 'delete') removerCadastro(id);
});
ui.form.addEventListener('submit', salvarCadastro);
ui.loginForm.addEventListener('submit', entrar);
ui.loginButton.addEventListener('click', () => ui.loginDialog.showModal());
ui.logoutButton.addEventListener('click', sair);
document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.close).close());
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    ui.search.focus();
  }
});

setResource(activeResource);
atualizarResumo();
