const SUPABASE_URL = 'https://czjbuakujyslcpiearrn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ckSMP4wV5PRKQxX7iVYxUg_ikzL1ky6';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const THEME_KEY = 'finance-control-theme';
const DEFAULT_CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Assinaturas',
  'Educação', 'Família', 'Impostos', 'Outros', 'Salário', 'Freelance'
];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const CHART_COLORS = ['#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

const state = {
  transactions: [],
  preferencesId: null,
  settings: { theme: 'light' },
  ui: {
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    sortField: 'date',
    sortDirection: 'desc',
    filterType: 'todos',
    filterNature: 'todos',
    search: '',
    topLimit: 5
  }
};

const el = {
  body: document.body,
  themeToggle: document.getElementById('themeToggle'),
  monthSelect: document.getElementById('monthSelect'),
  yearSelect: document.getElementById('yearSelect'),
  tabLinks: document.querySelectorAll('.tab-link'),
  sections: document.querySelectorAll('.page-section'),
  form: document.getElementById('transactionForm'),
  transactionId: document.getElementById('transactionId'),
  type: document.getElementById('type'),
  nature: document.getElementById('nature'),
  description: document.getElementById('description'),
  amount: document.getElementById('amount'),
  date: document.getElementById('date'),
  customCategory: document.getElementById('customCategory'),
  categorySuggestions: document.getElementById('categorySuggestions'),
  resetFormButton: document.getElementById('resetFormButton'),
  openFormButton: document.getElementById('openFormButton'),
  filterType: document.getElementById('filterType'),
  filterNature: document.getElementById('filterNature'),
  searchInput: document.getElementById('searchInput'),
  sortButtons: document.querySelectorAll('.sort-btn'),
  tableBody: document.getElementById('transactionsTableBody'),
  tableEmptyState: document.getElementById('tableEmptyState'),
  exportCsvButton: document.getElementById('exportCsvButton'),
  exportJsonButton: document.getElementById('exportJsonButton'),
  backupButton: document.getElementById('backupButton'),
  restoreInput: document.getElementById('restoreInput'),
  topLimitSelect: document.getElementById('topLimitSelect'),
  modalRoot: document.getElementById('modalRoot'),
  toastRoot: document.getElementById('toastRoot'),
  schemaPreview: document.getElementById('schemaPreview'),
  balanceValue: document.getElementById('balanceValue'),
  balanceStatus: document.getElementById('balanceStatus'),
  incomeTotal: document.getElementById('incomeTotal'),
  expenseTotal: document.getElementById('expenseTotal'),
  fixedIncomeTotal: document.getElementById('fixedIncomeTotal'),
  variableIncomeTotal: document.getElementById('variableIncomeTotal'),
  fixedCostTotal: document.getElementById('fixedCostTotal'),
  variableCostTotal: document.getElementById('variableCostTotal'),
  categorySpendingList: document.getElementById('categorySpendingList'),
  topCategoryBadge: document.getElementById('topCategoryBadge'),
  transactionsCount: document.getElementById('transactionsCount'),
  averageTicket: document.getElementById('averageTicket'),
  largestExpense: document.getElementById('largestExpense'),
  largestIncome: document.getElementById('largestIncome'),
  donutSlices: document.getElementById('donutSlices'),
  donutLegend: document.getElementById('donutLegend'),
  donutCenterValue: document.getElementById('donutCenterValue'),
  monthlyComparisonChart: document.getElementById('monthlyComparisonChart'),
  variationIndicator: document.getElementById('variationIndicator')
};
async function bootstrap() {
  bindEvents();
  el.date.value = toDateInputValue(new Date());

  try {
    await loadPreferencesFromSupabase();
    applyTheme(state.settings.theme, false);
    await loadTransactionsFromSupabase();
    buildPeriodFilters();
    updateCategorySuggestions();
    renderAll();
  } catch (error) {
    console.error(error);
    showToast('Erro ao carregar dados do Supabase.', 'error');
    buildPeriodFilters();
    updateCategorySuggestions();
    renderAll();
  }
}

async function loadTransactionsFromSupabase() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  state.transactions = (data || []).map(mapTransactionFromDb);
}

async function insertTransactionInSupabase(transaction) {
  const payload = mapTransactionToDb(transaction);

  const { data, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return mapTransactionFromDb(data);
}

async function updateTransactionInSupabase(transaction) {
  const payload = mapTransactionToDb(transaction);

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', transaction.id)
    .select()
    .single();

  if (error) throw error;
  return mapTransactionFromDb(data);
}

async function deleteTransactionInSupabase(id) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

async function loadPreferencesFromSupabase() {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) throw error;

  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    state.settings.theme = savedTheme;
  }

  const row = data?.[0];
  if (!row) return;

  state.preferencesId = row.id;
  state.settings.theme = row.theme || state.settings.theme;

  state.ui = {
    ...state.ui,
    selectedMonth: Number.isInteger(row.selected_month) ? row.selected_month : state.ui.selectedMonth,
    selectedYear: Number.isInteger(row.selected_year) ? row.selected_year : state.ui.selectedYear,
    sortField: row.sort_field || state.ui.sortField,
    sortDirection: row.sort_direction || state.ui.sortDirection,
    filterType: row.filter_type || state.ui.filterType,
    filterNature: row.filter_nature || state.ui.filterNature,
    search: row.search || state.ui.search,
    topLimit: row.top_limit || state.ui.topLimit
  };
}

async function persistPreferences() {
  const payload = {
    theme: state.settings.theme,
    selected_month: state.ui.selectedMonth,
    selected_year: state.ui.selectedYear,
    sort_field: state.ui.sortField,
    sort_direction: state.ui.sortDirection,
    filter_type: state.ui.filterType,
    filter_nature: state.ui.filterNature,
    search: state.ui.search,
    top_limit: state.ui.topLimit
  };

  if (state.preferencesId) {
    const { error } = await supabase
      .from('user_preferences')
      .update(payload)
      .eq('id', state.preferencesId);

    if (error) throw error;
    return;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  state.preferencesId = data.id;
}
function mapTransactionFromDb(row) {
  return {
    id: row.id,
    type: row.type,
    nature: row.nature,
    description: row.description,
    amount: Number(row.amount),
    date: row.date,
    customCategory: row.custom_category,
    createdAt: row.created_at || new Date().toISOString()
  };
}

function mapTransactionToDb(transaction) {
  return {
    type: transaction.type,
    nature: transaction.nature,
    description: transaction.description,
    amount: Number(transaction.amount),
    date: transaction.date,
    custom_category: transaction.customCategory
  };
}

function bindEvents() {
  el.themeToggle.addEventListener('click', async () => {
    await toggleTheme();
  });

  el.monthSelect.addEventListener('change', async () => {
    state.ui.selectedMonth = Number(el.monthSelect.value);
    await persistUiAndRender();
  });

  el.yearSelect.addEventListener('change', async () => {
    state.ui.selectedYear = Number(el.yearSelect.value);
    await persistUiAndRender();
  });

  el.tabLinks.forEach(button => {
    button.addEventListener('click', () => switchSection(button.dataset.section));
  });

  el.form.addEventListener('submit', handleFormSubmit);
  el.resetFormButton.addEventListener('click', resetForm);

  el.openFormButton.addEventListener('click', () => {
    switchSection('recordsSection');
    el.description.focus();
  });

  el.filterType.addEventListener('change', async () => {
    state.ui.filterType = el.filterType.value;
    await persistUiAndRenderTable();
  });

  el.filterNature.addEventListener('change', async () => {
    state.ui.filterNature = el.filterNature.value;
    await persistUiAndRenderTable();
  });

  el.searchInput.addEventListener('input', async () => {
    state.ui.search = el.searchInput.value.trim().toLowerCase();
    await persistUiAndRenderTable();
  });

  el.sortButtons.forEach(button => {
    button.addEventListener('click', async () => {
      await changeSort(button.dataset.sort);
    });
  });

  el.exportCsvButton.addEventListener('click', exportCsv);
  el.exportJsonButton.addEventListener('click', exportJson);
  el.backupButton.addEventListener('click', exportBackup);
  el.restoreInput.addEventListener('change', restoreBackup);

  el.topLimitSelect.addEventListener('change', async () => {
    state.ui.topLimit = Number(el.topLimitSelect.value);
    try {
      await persistPreferences();
    } catch (error) {
      console.error(error);
      showToast('Não foi possível salvar as preferências.', 'error');
    }
    renderDashboard();
    renderAnalytics();
    renderSchema();
  });
}

async function persistUiAndRender() {
  try {
    await persistPreferences();
  } catch (error) {
    console.error(error);
    showToast('Não foi possível salvar as preferências.', 'error');
  }
  renderAll();
}

async function persistUiAndRenderTable() {
  try {
    await persistPreferences();
  } catch (error) {
    console.error(error);
    showToast('Não foi possível salvar as preferências.', 'error');
  }
  renderTable();
  renderSchema();
}
async function handleFormSubmit(event) {
  event.preventDefault();

  const payload = getFormData();
  const validation = validateTransaction(payload);

  if (!validation.valid) {
    showToast(validation.message, 'error');
    return;
  }

  try {
    if (payload.id) {
      const updated = await updateTransactionInSupabase(payload);
      state.transactions = state.transactions.map(item => item.id === updated.id ? updated : item);
      showToast('Lançamento atualizado com sucesso.', 'success');
    } else {
      const created = await insertTransactionInSupabase(payload);
      state.transactions.unshift(created);
      showToast('Lançamento salvo com sucesso.', 'success');
    }

    updateCategorySuggestions();
    buildPeriodFilters();
    renderAll();
    resetForm();
  } catch (error) {
    console.error(error);
    showToast('Não foi possível salvar o lançamento.', 'error');
  }
}

function getFormData() {
  return {
    id: el.transactionId.value || '',
    type: el.type.value,
    nature: el.nature.value,
    description: el.description.value.trim(),
    amount: Number(el.amount.value),
    date: el.date.value,
    customCategory: capitalizeWords(el.customCategory.value.trim()),
    createdAt: new Date().toISOString()
  };
}

function validateTransaction(data) {
  if (!data.type || !data.nature || !data.description || !data.date || !data.customCategory) {
    return { valid: false, message: 'Preencha todos os campos obrigatórios.' };
  }

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    return { valid: false, message: 'Informe um valor maior que zero.' };
  }

  if (data.description.length < 3) {
    return { valid: false, message: 'A descrição precisa ter pelo menos 3 caracteres.' };
  }

  if (Number.isNaN(new Date(data.date).getTime())) {
    return { valid: false, message: 'Informe uma data válida.' };
  }

  return { valid: true };
}

function resetForm() {
  el.form.reset();
  el.transactionId.value = '';
  el.date.value = toDateInputValue(new Date());
}

async function changeSort(field) {
  if (state.ui.sortField === field) {
    state.ui.sortDirection = state.ui.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.ui.sortField = field;
    state.ui.sortDirection = field === 'amount' ? 'desc' : 'asc';
  }

  try {
    await persistPreferences();
  } catch (error) {
    console.error(error);
    showToast('Não foi possível salvar a ordenação.', 'error');
  }

  renderTable();
  renderSchema();
}
function renderAll() {
  renderDashboard();
  renderTable();
  renderAnalytics();
  renderSchema();
}

function getTransactionsForSelectedMonth() {
  return state.transactions.filter(item => {
    const date = new Date(`${item.date}T00:00:00`);
    return date.getMonth() === state.ui.selectedMonth && date.getFullYear() === state.ui.selectedYear;
  });
}

function renderDashboard() {
  const transactions = getTransactionsForSelectedMonth();
  const totals = calculateTotals(transactions);

  el.balanceValue.textContent = formatCurrency(totals.balance);
  el.incomeTotal.textContent = formatCurrency(totals.totalIncome);
  el.expenseTotal.textContent = formatCurrency(totals.totalExpense);
  el.fixedIncomeTotal.textContent = formatCurrency(totals.fixedIncome);
  el.variableIncomeTotal.textContent = formatCurrency(totals.variableIncome);
  el.fixedCostTotal.textContent = formatCurrency(totals.fixedCost);
  el.variableCostTotal.textContent = formatCurrency(totals.variableCost);
  el.transactionsCount.textContent = String(transactions.length);

  el.averageTicket.textContent = formatCurrency(
    transactions.length
      ? transactions.reduce((sum, item) => sum + item.amount, 0) / transactions.length
      : 0
  );

  el.largestExpense.textContent = formatCurrency(
    Math.max(0, ...transactions.filter(item => item.type === 'custo').map(item => item.amount))
  );

  el.largestIncome.textContent = formatCurrency(
    Math.max(0, ...transactions.filter(item => item.type === 'ganho').map(item => item.amount))
  );

  renderBalanceStatus(totals.balance, transactions.length);
  renderCategoryHighlights(transactions);
}

function calculateTotals(transactions) {
  return transactions.reduce((acc, item) => {
    if (item.type === 'ganho') {
      acc.totalIncome += item.amount;
      acc[item.nature === 'fixo' ? 'fixedIncome' : 'variableIncome'] += item.amount;
    } else {
      acc.totalExpense += item.amount;
      acc[item.nature === 'fixo' ? 'fixedCost' : 'variableCost'] += item.amount;
    }

    acc.balance = acc.totalIncome - acc.totalExpense;
    return acc;
  }, {
    totalIncome: 0,
    totalExpense: 0,
    fixedIncome: 0,
    variableIncome: 0,
    fixedCost: 0,
    variableCost: 0,
    balance: 0
  });
}

function renderBalanceStatus(balance, count) {
  el.balanceStatus.className = 'status-chip';

  if (!count) {
    el.balanceStatus.classList.add('neutral');
    el.balanceStatus.textContent = 'Sem movimentações';
    return;
  }

  if (balance > 0) {
    el.balanceStatus.classList.add('positive');
    el.balanceStatus.textContent = 'Saldo positivo';
  } else if (balance < 0) {
    el.balanceStatus.classList.add('negative');
    el.balanceStatus.textContent = 'Saldo negativo';
  } else {
    el.balanceStatus.classList.add('neutral');
    el.balanceStatus.textContent = 'Saldo zerado';
  }
}

function renderCategoryHighlights(transactions) {
  const expensesByCategory = groupByCategory(transactions.filter(item => item.type === 'custo'));
  const entries = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, state.ui.topLimit);

  if (!entries.length) {
    el.categorySpendingList.innerHTML = 'Nenhum gasto no período selecionado.';
    el.topCategoryBadge.textContent = 'Sem dados';
    return;
  }

  const totalExpenses = entries.reduce((sum, [, value]) => sum + value, 0);
  const [topCategory] = entries[0];

  el.topCategoryBadge.textContent = topCategory;
  el.categorySpendingList.innerHTML = entries.map(([category, value]) => {
    const percent = totalExpenses ? (value / totalExpenses) * 100 : 0;
    return `
      <div class="category-item">
        <div class="row">
          <strong>${escapeHtml(category)}</strong>
          <span>${formatCurrency(value)}</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width:${Math.max(percent, 6)}%"></div>
        </div>
      </div>
    `;
  }).join('');
}
function renderTable() {
  const data = getFilteredTransactions();

  el.tableBody.innerHTML = data.map(item => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.description)}</td>
      <td>${escapeHtml(item.customCategory)}<br><small>${item.nature === 'fixo' ? 'Fixo' : 'Variável'}</small></td>
      <td><span class="type-pill ${item.type}">${item.type === 'ganho' ? 'Ganho' : 'Custo'}</span></td>
      <td>${formatCurrency(item.amount)}</td>
      <td>
        <div class="table-actions">
          <button class="table-action" type="button" data-edit="${item.id}">Editar</button>
          <button class="table-action" type="button" data-delete="${item.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');

  el.tableEmptyState.style.display = data.length ? 'none' : 'block';

  el.tableBody.querySelectorAll('[data-edit]').forEach(button => {
    button.addEventListener('click', () => editTransaction(button.dataset.edit));
  });

  el.tableBody.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', () => confirmDeletion(button.dataset.delete));
  });
}

function getFilteredTransactions() {
  const monthTransactions = getTransactionsForSelectedMonth();

  const filtered = monthTransactions.filter(item => {
    const matchesType = state.ui.filterType === 'todos' || item.type === state.ui.filterType;
    const matchesNature = state.ui.filterNature === 'todos' || item.nature === state.ui.filterNature;
    const haystack = `${item.description} ${item.customCategory}`.toLowerCase();
    const matchesSearch = !state.ui.search || haystack.includes(state.ui.search);
    return matchesType && matchesNature && matchesSearch;
  });

  const direction = state.ui.sortDirection === 'asc' ? 1 : -1;

  return filtered.sort((a, b) => {
    let left;
    let right;

    switch (state.ui.sortField) {
      case 'date':
        left = new Date(`${a.date}T00:00:00`).getTime();
        right = new Date(`${b.date}T00:00:00`).getTime();
        return (left - right) * direction;

      case 'amount':
        left = a.amount;
        right = b.amount;
        return (left - right) * direction;

      case 'customCategory':
        left = a.customCategory;
        right = b.customCategory;
        return String(left).localeCompare(String(right), 'pt-BR') * direction;

      case 'description':
      default:
        left = a.description;
        right = b.description;
        return String(left).localeCompare(String(right), 'pt-BR') * direction;
    }
  });
}

function editTransaction(id) {
  const transaction = state.transactions.find(item => item.id === id);
  if (!transaction) return;

  switchSection('recordsSection');
  el.transactionId.value = transaction.id;
  el.type.value = transaction.type;
  el.nature.value = transaction.nature;
  el.description.value = transaction.description;
  el.amount.value = transaction.amount;
  el.date.value = transaction.date;
  el.customCategory.value = transaction.customCategory;
  el.description.focus();
}

function confirmDeletion(id) {
  openConfirmModal({
    message: 'Deseja realmente excluir este lançamento? Essa ação não pode ser desfeita.',
    confirmText: 'Excluir',
    onConfirm: async () => {
      try {
        await deleteTransactionInSupabase(id);
        state.transactions = state.transactions.filter(item => item.id !== id);
        buildPeriodFilters();
        updateCategorySuggestions();
        renderAll();
        showToast('Lançamento excluído.', 'success');
      } catch (error) {
        console.error(error);
        showToast('Não foi possível excluir o lançamento.', 'error');
      }
    }
  });
}
function renderAnalytics() {
  const currentTransactions = getTransactionsForSelectedMonth();
  const expenseGroups = Object.entries(groupByCategory(currentTransactions.filter(item => item.type === 'custo')))
    .sort((a, b) => b[1] - a[1]);

  renderDonutChart(expenseGroups);
  renderMonthlyComparison();
}

function renderDonutChart(groups) {
  el.donutSlices.innerHTML = '';

  if (!groups.length) {
    el.donutLegend.innerHTML = 'Sem custos no período.';
    el.donutCenterValue.textContent = 'R$ 0';
    return;
  }

  const total = groups.reduce((sum, [, value]) => sum + value, 0);
  el.donutCenterValue.textContent = formatCurrency(total);

  let cumulative = 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  el.donutSlices.innerHTML = groups.map(([category, value], index) => {
    const fraction = value / total;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const rotation = cumulative * 360 - 90;
    cumulative += fraction;

    return `
      <circle
        cx="60"
        cy="60"
        r="42"
        fill="none"
        stroke="${CHART_COLORS[index % CHART_COLORS.length]}"
        stroke-width="16"
        stroke-dasharray="${dash} ${gap}"
        transform="rotate(${rotation} 60 60)"
        stroke-linecap="butt"></circle>
    `;
  }).join('');

  el.donutLegend.innerHTML = groups.map(([category, value], index) => {
    const percent = ((value / total) * 100).toFixed(1).replace('.', ',');
    return `
      <div class="legend-item">
        <div class="title">
          <strong><span class="legend-swatch" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span>${escapeHtml(category)}</strong>
          <span>${percent}%</span>
        </div>
        <span>${formatCurrency(value)}</span>
      </div>
    `;
  }).join('');
}

function renderMonthlyComparison() {
  const months = getLastSixMonths();
  const totals = months.map(({ year, monthIndex, label }) => {
    const items = state.transactions.filter(item => {
      const date = new Date(`${item.date}T00:00:00`);
      return date.getFullYear() === year && date.getMonth() === monthIndex;
    });

    const summary = calculateTotals(items);
    return {
      label,
      balance: summary.balance,
      income: summary.totalIncome,
      expense: summary.totalExpense
    };
  });

  const maxValue = Math.max(1, ...totals.map(item => Math.abs(item.balance)));

  el.monthlyComparisonChart.innerHTML = totals.map(item => {
    const width = Math.max((Math.abs(item.balance) / maxValue) * 100, item.balance === 0 ? 4 : 8);
    const klass = item.balance >= 0 ? '' : 'negative';

    return `
      <div class="bar-row">
        <div class="bar-meta"><strong>${item.label}</strong><span>${formatCurrency(item.balance)}</span></div>
        <div class="bar-track"><div class="bar-fill ${klass}" style="width:${width}%"></div></div>
      </div>
    `;
  }).join('');

  const current = totals[totals.length - 1]?.balance ?? 0;
  const previous = totals[totals.length - 2]?.balance ?? 0;
  renderVariation(current, previous);
}

function renderVariation(current, previous) {
  el.variationIndicator.className = 'variation-card';

  if (previous === 0) {
    el.variationIndicator.classList.add('neutral');
    el.variationIndicator.textContent = 'Sem base para comparar com o mês anterior.';
    return;
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;
  const formatted = `${change >= 0 ? '+' : ''}${change.toFixed(1).replace('.', ',')}%`;

  if (change >= 0) {
    el.variationIndicator.classList.add('positive');
    el.variationIndicator.textContent = `Saldo variou ${formatted} em relação ao mês anterior.`;
  } else {
    el.variationIndicator.classList.add('negative');
    el.variationIndicator.textContent = `Saldo variou ${formatted} em relação ao mês anterior.`;
  }
}

function getLastSixMonths() {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(state.ui.selectedYear, state.ui.selectedMonth - (5 - index), 1);
    return {
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      label: `${MONTHS[date.getMonth()].slice(0, 3)}/${String(date.getFullYear()).slice(-2)}`
    };
  });
}

function groupByCategory(items) {
  return items.reduce((acc, item) => {
    acc[item.customCategory] = (acc[item.customCategory] || 0) + item.amount;
    return acc;
  }, {});
}

function updateCategorySuggestions() {
  const dynamic = new Set(DEFAULT_CATEGORIES);
  state.transactions.forEach(item => dynamic.add(item.customCategory));

  el.categorySuggestions.innerHTML = [...dynamic]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map(item => `<option value="${item}"></option>`)
    .join('');
}
function renderSchema() {
  const schema = {
    transactions: [
      {
        id: 'uuid',
        type: 'ganho | custo',
        nature: 'fixo | variavel',
        description: 'string',
        amount: 1200.5,
        date: '2026-04-23',
        customCategory: 'Salário'
      }
    ],
    settings: {
      theme: state.settings.theme
    },
    ui: {
      selectedMonth: state.ui.selectedMonth,
      selectedYear: state.ui.selectedYear,
      sortField: state.ui.sortField,
      sortDirection: state.ui.sortDirection,
      filterType: state.ui.filterType,
      filterNature: state.ui.filterNature,
      search: state.ui.search,
      topLimit: state.ui.topLimit
    }
  };

  el.schemaPreview.textContent = JSON.stringify(schema, null, 2);
}

async function toggleTheme() {
  const next = state.settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next, true);
}

function applyTheme(theme, shouldPersist = true) {
  state.settings.theme = theme;
  el.body.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_KEY, theme);

  if (shouldPersist) {
    persistPreferences().catch(error => {
      console.error(error);
      showToast('Não foi possível salvar o tema.', 'error');
    });
  }
}

function exportCsv() {
  const rows = getFilteredTransactions();

  if (!rows.length) {
    showToast('Não há dados para exportar em CSV.', 'error');
    return;
  }

  const headers = ['Data', 'Descrição', 'Categoria personalizada', 'Tipo', 'Categoria', 'Valor'];

  const csv = [headers.join(';')]
    .concat(
      rows.map(item => [
        formatDate(item.date),
        item.description,
        item.customCategory,
        item.type,
        item.nature,
        item.amount.toFixed(2).replace('.', ',')
      ].map(value => `"${String(value).replaceAll('"', '""')}"`).join(';'))
    )
    .join('\n');

  downloadFile(
    csv,
    `lancamentos-${state.ui.selectedYear}-${String(state.ui.selectedMonth + 1).padStart(2, '0')}.csv`,
    'text/csv;charset=utf-8;'
  );
}

function exportJson() {
  const rows = getFilteredTransactions();

  if (!rows.length) {
    showToast('Não há dados para exportar em JSON.', 'error');
    return;
  }

  downloadFile(JSON.stringify(rows, null, 2), `lancamentos-${Date.now()}.json`, 'application/json');
}

function exportBackup() {
  const payload = JSON.stringify({
    exportedAt: new Date().toISOString(),
    data: {
      transactions: state.transactions,
      settings: state.settings,
      ui: state.ui
    }
  }, null, 2);

  downloadFile(payload, `backup-financeiro-${Date.now()}.json`, 'application/json');
}
async function restoreBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const data = parsed.data || parsed;

    if (!Array.isArray(data.transactions)) {
      throw new Error('Estrutura inválida.');
    }

    const mappedTransactions = data.transactions.map(item => ({
      id: item.id || crypto.randomUUID(),
      type: item.type,
      nature: item.nature,
      description: item.description,
      amount: Number(item.amount),
      date: item.date,
      customCategory: item.customCategory || item.custom_category || 'Outros',
      createdAt: item.createdAt || new Date().toISOString()
    }));

    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) throw deleteError;

    if (mappedTransactions.length) {
      const rows = mappedTransactions.map(mapTransactionToDb);

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(rows);

      if (insertError) throw insertError;
    }

    state.transactions = mappedTransactions;
    state.settings = { ...state.settings, ...(data.settings || {}) };
    state.ui = { ...state.ui, ...(data.ui || {}) };

    await persistPreferences();

    buildPeriodFilters();
    applyTheme(state.settings.theme, false);
    updateCategorySuggestions();
    renderAll();
    showToast('Backup restaurado com sucesso.', 'success');
  } catch (error) {
    console.error(error);
    showToast('Arquivo de backup inválido ou erro ao restaurar.', 'error');
  } finally {
    event.target.value = '';
  }
}

function openConfirmModal({ message, confirmText = 'Confirmar', onConfirm }) {
  const template = document.getElementById('confirmModalTemplate');
  const fragment = template.content.cloneNode(true);
  const backdrop = fragment.querySelector('.modal-backdrop');

  fragment.querySelector('#confirmModalMessage').textContent = message;
  fragment.querySelector('[data-modal-confirm]').textContent = confirmText;
  fragment.querySelector('[data-modal-cancel]').addEventListener('click', closeModal);
  fragment.querySelector('[data-modal-confirm]').addEventListener('click', async () => {
    closeModal();
    await onConfirm();
  });

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) closeModal();
  });

  el.modalRoot.innerHTML = '';
  el.modalRoot.appendChild(fragment);

  const confirmButton = el.modalRoot.querySelector('[data-modal-confirm]');
  confirmButton.focus();
}

function closeModal() {
  el.modalRoot.innerHTML = '';
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  el.toastRoot.innerHTML = '';
  el.toastRoot.appendChild(toast);

  window.setTimeout(() => {
    if (el.toastRoot.contains(toast)) {
      el.toastRoot.removeChild(toast);
    }
  }, 2600);
}
function buildPeriodFilters() {
  el.monthSelect.innerHTML = MONTHS
    .map((month, index) => `<option value="${index}">${month}</option>`)
    .join('');

  const years = getAvailableYears();
  el.yearSelect.innerHTML = years
    .map(year => `<option value="${year}">${year}</option>`)
    .join('');

  el.monthSelect.value = String(state.ui.selectedMonth);
  el.yearSelect.value = String(state.ui.selectedYear);
  el.filterType.value = state.ui.filterType;
  el.filterNature.value = state.ui.filterNature;
  el.searchInput.value = state.ui.search;
  el.topLimitSelect.value = String(state.ui.topLimit);
}

function getAvailableYears() {
  const years = new Set([new Date().getFullYear(), state.ui.selectedYear]);
  state.transactions.forEach(item => years.add(new Date(`${item.date}T00:00:00`).getFullYear()));
  return [...years].sort((a, b) => b - a);
}

function switchSection(sectionId) {
  el.sections.forEach(section => {
    section.classList.toggle('active', section.id === sectionId);
  });

  el.tabLinks.forEach(button => {
    button.classList.toggle('active', button.dataset.section === sectionId);
  });
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
  showToast('Arquivo exportado com sucesso.', 'success');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${dateString}T00:00:00`));
}

function toDateInputValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function capitalizeWords(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

bootstrap();
