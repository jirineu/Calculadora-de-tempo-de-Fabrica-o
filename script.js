// ====================================================================
// --- FUNÇÕES DE UTILIDADE E LOCAL STORAGE ---
// ====================================================================

// Base de Mão de Obra (M.O.D.) Simulada: R$ 50,00 por produto (APENAS SIMULADA - O cálculo real é feito no Módulo Roteiros)
const CUSTO_MOD_SIMULADO = 50.00; 

/** Puxa dados do Local Storage ou inicializa com array vazio */
function getStorageData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

/** Salva dados no Local Storage */
function setStorageData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

/** Função para formatar o valor como moeda brasileira (R$) */
function formatarMoeda(valor) {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Gera um ID simples */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- VARIÁVEIS DE ESTADO (Inicialização) ---
let materiais = getStorageData('materiais');
let produtos = getStorageData('produtos');
let clientes = getStorageData('clientes');
let vendas = getStorageData('vendas');

let produtoEmEdicao = { 
    materiais: [] 
}; // Estado temporário para a criação/edição de produtos

let clienteSelecionado = null; // Novo estado para o cliente na venda

// ====================================================================
// --- GESTÃO DE PÁGINAS (NAVEGAÇÃO) ---
// ====================================================================

function showPage(pageId, extraData = null) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active-page');
    });
    
    document.getElementById(`${pageId}-page`).classList.add('active-page');
    
    // Atualiza a barra de navegação
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
            document.getElementById('page-title').textContent = link.textContent.trim();
        }
    });

    // Ações específicas ao mudar de página
    if (pageId === 'dashboard') updateDashboard();
    if (pageId === 'estoque') renderMateriaisList();
    if (pageId === 'produtos') {
        renderProdutosList();
        loadMateriaisOptions();
        resetProdutoForm();
    }
    
    // INICIALIZAÇÃO DO MÓDULO ROTEIROS
    if (pageId === 'roteiros') {
        renderizarItensDisponiveis();
        // Não é mais necessário chamar renderFuncionariosList/renderMaquinariosList aqui,
        // pois elas serão chamadas na showInternalPage ou pelos listeners internos.
        showInternalPage('roteiro'); // Função interna do roteiro
        toggleContentVisibility(); // Exibe ou oculta o conteúdo se o produto estiver "selecionado"
    }
    
    if (pageId === 'vendas') {
        loadProdutosOptionsForVenda();
        resetVendaState(); // Reseta cliente selecionado e formulários de venda
    }
    if (pageId === 'clientes') renderClientesList();
    if (pageId === 'cliente-detalhe' && extraData) renderClienteDetalhe(extraData);
}

// ====================================================================
// --- 1. DASHBOARD ---
// ====================================================================

function updateDashboard() {
    const totalFaturamento = vendas.reduce((sum, venda) => sum + (venda.precoVenda * venda.quantidade), 0);
    
    document.getElementById('faturamento-value').textContent = formatarMoeda(totalFaturamento).replace('R$', '').trim();
    document.getElementById('clientes-value').textContent = clientes.length;
    document.getElementById('produtos-cadastrados-value').textContent = produtos.length;
    
    document.getElementById('chart-vendas').querySelector('p').textContent = 
        `Total de Vendas Registradas: ${vendas.length}. (Gráfico de valores anuais necessita de dados de datas e uma biblioteca externa).`;
}

// ====================================================================
// --- 2. MATERIAIS (Custo Fracionável) ---
// ====================================================================

document.getElementById('material-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const nome = document.getElementById('material-nome').value.trim();
    const custo = parseFloat(document.getElementById('material-custo').value);
    
    // Removemos a validação de quantidade e salvamos apenas custo.

    const materialExistente = materiais.find(m => m.nome.toLowerCase() === nome.toLowerCase());

    if (materialExistente) {
        materialExistente.custo = custo;
        alert(`Custo do Material '${nome}' atualizado para ${formatarMoeda(custo)}!`);
    } else {
        const novoMaterial = {
            id: generateId(),
            nome: nome,
            custo: custo, // Custo Unitário Base para fracionamento
        };
        materiais.push(novoMaterial);
        alert(`Material '${nome}' cadastrado com sucesso! Custo base: ${formatarMoeda(custo)}.`);
    }

    setStorageData('materiais', materiais);
    renderMateriaisList();
    this.reset();
});

function renderMateriaisList() {
    const tbody = document.getElementById('materiais-list').querySelector('tbody');
    tbody.innerHTML = '';

    materiais.forEach(material => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${material.id.substring(0, 5)}...</td>
            <td>${material.nome}</td>
            <td>${formatarMoeda(material.custo)}</td>
            <td class="actions-cell">
                <button class="btn-danger" onclick="deleteMaterial('${material.id}')">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteMaterial(id) {
    if (confirm('Tem certeza que deseja excluir este material? Ele será removido dos produtos que o utilizam.')) {
        materiais = materiais.filter(m => m.id !== id);
        setStorageData('materiais', materiais);
        renderMateriaisList();
    }
}

// ====================================================================
// --- 3. PRODUTOS (Composição Fracionada) ---
// ====================================================================

function loadMateriaisOptions() {
    const select = document.getElementById('select-material');
    select.innerHTML = '<option value="">Selecione um Material</option>';

    materiais.forEach(material => {
        const option = document.createElement('option');
        option.value = material.id;
        option.textContent = `${material.nome} (Custo Base: ${formatarMoeda(material.custo)})`;
        select.appendChild(option);
    });
}

function calculateProductCost() {
    let custoMateriaPrima = 0;
    produtoEmEdicao.materiais.forEach(comp => {
        const material = materiais.find(m => m.id === comp.materialId);
        if (material) {
            // CÁLCULO FRACIONADO: material.custo * comp.quantidadeUso
            // comp.quantidadeUso pode ser 0.01, 0.5, 1, 2.5 etc.
            custoMateriaPrima += material.custo * comp.quantidadeUso;
        }
    });

    const custoTotal = custoMateriaPrima + CUSTO_MOD_SIMULADO; // Soma com a M.O.D. simulada

    document.getElementById('custo-materia-prima').textContent = formatarMoeda(custoMateriaPrima).replace('R$', '').trim();
    document.getElementById('custo-total-produto').textContent = formatarMoeda(custoTotal).replace('R$', '').trim();

    return { custoMateriaPrima, custoTotal };
}

function renderComposicaoList() {
    const compoList = document.getElementById('materiais-compo-list');
    compoList.innerHTML = '';

    if (produtoEmEdicao.materiais.length === 0) {
        compoList.innerHTML = '<p style="color:#7f8c8d;">Nenhum material adicionado.</p>';
        return;
    }

    produtoEmEdicao.materiais.forEach(comp => {
        const material = materiais.find(m => m.id === comp.materialId);
        if (material) {
            const custoFracionado = material.custo * comp.quantidadeUso;
            const div = document.createElement('div');
            div.classList.add('material-item');
            div.innerHTML = `
                <span>${material.nome} (${comp.quantidadeUso}) - Custo na Composição: ${formatarMoeda(custoFracionado)}</span>
                <button class="btn-danger btn-sm" onclick="removeMaterialFromProduct('${comp.materialId}')">Remover</button>
            `;
            compoList.appendChild(div);
        }
    });

    calculateProductCost();
}

function addMaterialToProduct() {
    const materialId = document.getElementById('select-material').value;
    const quantidadeUso = parseFloat(document.getElementById('qtd-material').value);

    if (!materialId || isNaN(quantidadeUso) || quantidadeUso <= 0) {
        alert('Selecione um material e insira uma quantidade válida.');
        return;
    }

    // Verifica se o material já está na composição para evitar duplicidade simples
    const materialExistenteIndex = produtoEmEdicao.materiais.findIndex(m => m.materialId === materialId);

    if (materialExistenteIndex !== -1) {
        // Atualiza a quantidade se já existir
        produtoEmEdicao.materiais[materialExistenteIndex].quantidadeUso = quantidadeUso;
    } else {
        produtoEmEdicao.materiais.push({
            materialId: materialId,
            quantidadeUso: quantidadeUso,
        });
    }

    document.getElementById('select-material').value = '';
    document.getElementById('qtd-material').value = '';
    
    renderComposicaoList();
}

function removeMaterialFromProduct(materialId) {
    produtoEmEdicao.materiais = produtoEmEdicao.materiais.filter(m => m.materialId !== materialId);
    renderComposicaoList();
}

document.getElementById('produto-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const idEdicao = document.getElementById('produto-id-edicao').value;
    const nome = document.getElementById('produto-nome').value.trim();
    const sku = document.getElementById('produto-sku').value.trim();
    const precoVenda = parseFloat(document.getElementById('produto-preco').value);
    
    if (produtoEmEdicao.materiais.length === 0) {
        alert('O produto deve ter pelo menos um material na composição.');
        return;
    }

    const custos = calculateProductCost();

    if (idEdicao) {
        // EDIÇÃO
        const index = produtos.findIndex(p => p.id === idEdicao);
        if (index !== -1) {
            produtos[index] = {
                ...produtos[index],
                nome: nome,
                sku: sku,
                precoVenda: precoVenda,
                materiais: produtoEmEdicao.materiais,
                custoMateriaPrima: custos.custoMateriaPrima,
                custoTotal: custos.custoTotal,
            };
            alert('Produto atualizado com sucesso!');
        }
    } else {
        // CRIAÇÃO
        const novoProduto = {
            id: generateId(),
            nome: nome,
            sku: sku,
            precoVenda: precoVenda,
            materiais: produtoEmEdicao.materiais, // Salva a composição
            custoMateriaPrima: custos.custoMateriaPrima,
            custoTotal: custos.custoTotal,
            // NOVOS CAMPOS ADICIONADOS PARA O CUSTO REAL ESTIMADO DO ROTEIRO
            custoMODRoteiro: CUSTO_MOD_SIMULADO, // Inicializa com o simulado
            custoTotalEstimado: custos.custoTotal, // Custo total inicial (Simulado)
        };
        produtos.push(novoProduto);
        alert('Produto cadastrado com sucesso!');
    }

    setStorageData('produtos', produtos);
    renderProdutosList();
    resetProdutoForm();
});

function renderProdutosList() {
    const tbody = document.getElementById('produtos-list').querySelector('tbody');
    tbody.innerHTML = '';

    produtos.forEach(produto => {
        const tr = document.createElement('tr');
        // MODIFICAÇÃO: Usa custoTotalEstimado (custo real) se existir, senão usa custoTotal (simulado)
        const custoParaExibir = produto.custoTotalEstimado || produto.custoTotal;
        
        tr.innerHTML = `
            <td>${produto.sku}</td>
            <td>${produto.nome}</td>
            <td>${formatarMoeda(custoParaExibir)}</td>
            <td>${formatarMoeda(produto.precoVenda)}</td>
            <td class="actions-cell">
                <button class="btn-secondary btn-sm" onclick="editProduto('${produto.id}')">Editar</button>
                <button class="btn-danger btn-sm" onclick="deleteProduto('${produto.id}')">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    document.getElementById('produto-nome').value = produto.nome;
    document.getElementById('produto-sku').value = produto.sku;
    document.getElementById('produto-preco').value = produto.precoVenda;
    document.getElementById('produto-id-edicao').value = produto.id;

    // Carrega a composição para o estado de edição
    produtoEmEdicao.materiais = JSON.parse(JSON.stringify(produto.materiais));
    
    document.querySelector('#produto-form button[type="submit"]').textContent = 'Atualizar Produto';
    document.querySelector('#produto-form h2').textContent = 'Edição de Produto Final';

    renderComposicaoList();
    window.scrollTo(0, 0); // Volta para o topo para ver o formulário
}

function deleteProduto(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        produtos = produtos.filter(p => p.id !== id);
        setStorageData('produtos', produtos);
        renderProdutosList();
        resetProdutoForm();
    }
}

function resetProdutoForm() {
    document.getElementById('produto-form').reset();
    document.getElementById('produto-id-edicao').value = '';
    document.querySelector('#produto-form button[type="submit"]').textContent = 'Salvar Produto';
    document.querySelector('#produto-form h2').textContent = 'Criação de Produto Final';
    
    produtoEmEdicao.materiais = [];
    document.getElementById('custo-materia-prima').textContent = '0,00';
    document.getElementById('custo-total-produto').textContent = '0,00';

    renderComposicaoList();
}


// ====================================================================
// --- 4. VENDAS ---
// ====================================================================

document.getElementById('venda-cliente').addEventListener('input', function() {
    const input = this.value.toLowerCase();
    const clienteMatch = clientes.find(c => 
        c.nome.toLowerCase().includes(input) || 
        c.cpfcnpj.includes(input)
    );
    
    clienteSelecionado = clienteMatch || null;
    
    const display = document.getElementById('cliente-selecionado-display');
    const btn = document.getElementById('btn-registrar-venda');

    if (clienteSelecionado) {
        display.textContent = `${clienteSelecionado.nome} (ID: ${clienteSelecionado.id.substring(0, 5)}...)`;
        btn.disabled = false;
    } else {
        display.textContent = 'Nenhum';
        btn.disabled = true;
    }
});

function loadProdutosOptionsForVenda() {
    const select = document.getElementById('venda-produto');
    select.innerHTML = '<option value="">Selecione um Produto</option>';

    produtos.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.id;
        option.textContent = `${produto.nome} (SKU: ${produto.sku}) - Preço: ${formatarMoeda(produto.precoVenda)}`;
        select.appendChild(option);
    });
}

document.getElementById('venda-form').addEventListener('submit', function(e) {
    e.preventDefault();

    if (!clienteSelecionado) {
        alert('Selecione um cliente válido.');
        return;
    }
    
    const produtoId = document.getElementById('venda-produto').value;
    const quantidade = parseInt(document.getElementById('venda-quantidade').value);
    const data = document.getElementById('venda-data').value;
    
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto || quantidade <= 0) {
        alert('Verifique os dados do produto e a quantidade.');
        return;
    }
    
    const novaVenda = {
        id: generateId(),
        clienteId: clienteSelecionado.id,
        nomeCliente: clienteSelecionado.nome,
        produtoId: produto.id,
        nomeProduto: produto.nome,
        quantidade: quantidade,
        precoVenda: produto.precoVenda,
        data: data,
    };
    
    vendas.push(novaVenda);
    setStorageData('vendas', vendas);
    renderVendasList();
    resetVendaState();
    updateDashboard();
    alert(`Venda de ${quantidade}x ${produto.nome} para ${clienteSelecionado.nome} registrada com sucesso!`);
});

function renderVendasList() {
    const tbody = document.getElementById('vendas-list').querySelector('tbody');
    tbody.innerHTML = '';
    
    vendas.sort((a, b) => new Date(b.data) - new Date(a.data)); // Ordena por data decrescente

    vendas.forEach(venda => {
        const tr = document.createElement('tr');
        const total = venda.quantidade * venda.precoVenda;
        tr.innerHTML = `
            <td>${venda.data}</td>
            <td><a href="#" onclick="showPage('cliente-detalhe', '${venda.clienteId}'); return false;">${venda.nomeCliente}</a></td>
            <td>${venda.nomeProduto}</td>
            <td>${venda.quantidade}</td>
            <td>${formatarMoeda(venda.precoVenda)}</td>
            <td>${formatarMoeda(total)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function resetVendaState() {
    document.getElementById('venda-form').reset();
    clienteSelecionado = null;
    document.getElementById('cliente-selecionado-display').textContent = 'Nenhum';
    document.getElementById('btn-registrar-venda').disabled = true;
}


// ====================================================================
// --- 5. CLIENTES ---
// ====================================================================

document.getElementById('cliente-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const nome = document.getElementById('cliente-nome').value.trim();
    const cpfcnpj = document.getElementById('cliente-cpfcnpj').value.trim();
    const endereco = document.getElementById('cliente-endereco').value.trim();
    
    const novoCliente = {
        id: generateId(),
        nome: nome,
        cpfcnpj: cpfcnpj,
        endereco: endereco,
    };
    
    clientes.push(novoCliente);
    setStorageData('clientes', clientes);
    renderClientesList();
    this.reset();
    updateDashboard();
    alert(`Cliente '${nome}' cadastrado com sucesso!`);
});

function renderClientesList() {
    const tbody = document.getElementById('clientes-list').querySelector('tbody');
    tbody.innerHTML = '';

    clientes.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cliente.nome}</td>
            <td>${cliente.cpfcnpj}</td>
            <td>${cliente.endereco}</td>
            <td class="actions-cell">
                <button class="btn-secondary btn-sm" onclick="showPage('cliente-detalhe', '${cliente.id}')">Detalhes</button>
                <button class="btn-danger btn-sm" onclick="deleteCliente('${cliente.id}')">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Popula o datalist
    const datalist = document.getElementById('cliente-datalist');
    datalist.innerHTML = clientes.map(c => `<option value="${c.nome} (${c.cpfcnpj})">`).join('');
}

function deleteCliente(id) {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        clientes = clientes.filter(c => c.id !== id);
        vendas = vendas.filter(v => v.clienteId !== id); // Remove vendas associadas
        setStorageData('clientes', clientes);
        setStorageData('vendas', vendas);
        renderClientesList();
        renderVendasList();
        updateDashboard();
    }
}

function renderClienteDetalhe(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) {
        showPage('clientes'); // Volta se não encontrar
        return;
    }
    
    document.getElementById('cliente-detalhe-nome').textContent = `Detalhes do Cliente: ${cliente.nome}`;
    document.getElementById('detalhe-nome').textContent = cliente.nome;
    document.getElementById('detalhe-cpfcnpj').textContent = cliente.cpfcnpj;
    document.getElementById('detalhe-endereco').textContent = cliente.endereco;

    const comprasCliente = vendas.filter(v => v.clienteId === clienteId).sort((a, b) => new Date(b.data) - new Date(a.data));
    const ultimasComprasList = document.getElementById('detalhe-ultimas-compras');
    
    if (comprasCliente.length === 0) {
        ultimasComprasList.innerHTML = '<li>Nenhuma compra registrada.</li>';
    } else {
        ultimasComprasList.innerHTML = '';
        comprasCliente.slice(0, 5).forEach(venda => { // Exibe as 5 últimas
            const li = document.createElement('li');
            li.textContent = `${venda.data} - ${venda.nomeProduto} (${venda.quantidade}x) - Total: ${formatarMoeda(venda.quantidade * venda.precoVenda)}`;
            ultimasComprasList.appendChild(li);
        });
    }

    // Mini Gráfico de Valores do Último Ano (Simulação)
    const totalVendido = comprasCliente.reduce((sum, v) => sum + (v.quantidade * v.precoVenda), 0);
    document.getElementById('cliente-grafico-info').textContent = 
        `O cliente comprou ${comprasCliente.length} vezes. Total vendido (histórico): ${formatarMoeda(totalVendido)}. (Gráfico simulado).`;
}


// ====================================================================
// --- MÓDULO ROTEIROS (Diluído de roteiros.html) ---
// ====================================================================

// ===================================
// VARIÁVEIS DE ESTADO E PERSISTÊNCIA (Módulo Roteiros)
// ===================================
let itensRoteiro = getStorageData('itensRoteiro') || [
    // Exemplo de itens iniciais
    { "id": "corte", "nome": "Corte", "setor": "Serralheria", "profissionalId": null, "maquinarioId": null, "dependeMedidas": true, "dependeFlange": false, "operacaoConjunto": false, "tempos": [ { "min": 1, "max": 3.9, "setup": 2, "operacao": 1.5 }, { "min": 4, "max": 6, "setup": 4, "operacao": 4.5 }, { "min": 6.1, "max": 12, "setup": 5, "operacao": 6.5 } ] },
    { "id": "plasma", "nome": "Plasma", "setor": "Serralheria", "profissionalId": null, "maquinarioId": null, "dependeMedidas": true, "dependeFlange": true, "operacaoConjunto": false, "temposFlang": [ { "min": 1, "max": 3.9, "setup": 5, "operacao": 5 }, { "min": 4, "max": 6, "setup": 5, "operacao": 7 }, { "min": 6.1, "max": 12, "setup": 5, "operacao": 10 } ], "temposEng": [ { "min": 1, "max": 3.9, "setup": 2, "operacao": 2 }, { "min": 4, "max": 6, "setup": 1, "operacao": 3 }, { "min": 6.1, "max": 12, "setup": 2, "operacao": 6 } ] },
    { "id": "soldagem_base", "nome": "Soldagem Base", "setor": "Calderaria", "profissionalId": null, "maquinarioId": null, "dependeMedidas": true, "dependeFlange": true, "operacaoConjunto": false, "temposFlang": [ { "min": 1, "max": 3.9, "setup": 3, "operacao": 5 }, { "min": 4, "max": 6, "setup": 3, "operacao": 7 }, { "min": 6.1, "max": 12, "setup": 3, "operacao": 10 } ], "temposEng": [ { "min": 1, "max": 3.9, "setup": 0, "operacao": 0 }, { "min": 4, "max": 6, "setup": 0, "operacao": 0 }, { "min": 6.1, "max": 12, "setup": 0, "operacao": 0 } ] },
    { "id": "acabamento", "nome": "Acabamento", "setor": "Expedição", "profissionalId": null, "maquinarioId": null, "dependeMedidas": false, "dependeFlange": false, "operacaoConjunto": true, "tempos": [ { "min": 1, "max": 12, "setup": 5, "operacao": 5 } ] }
]; 
let roteiroProducao = []; // Instâncias no roteiro atual (não persistido)
let funcionarios = getStorageData('funcionariosRoteiro') || []; // { id, nome, salarioMensal, custoHora }
let maquinarios = getStorageData('maquinariosRoteiro') || []; // { id, nome, setor, profissionalId }

const ITENS_AUTO_FLANG = ['soldagem_base', 'acabamento'];
let custoCalculadoMOD = 0;
let tempoCalculadoTotalMin = 0;

// Variável de simulação (para o módulo funcionar isoladamente, conforme roteiros.html)
let produtoERPBusca = null; // {id: '...', nome: '...'}
let produtoSelecionado = { id: 'PROD123', nome: 'Poste Curvo', ativo: false }; 

// ===================================
// --- GESTÃO DE PÁGINAS INTERNAS (Roteiro, Maquinários, Funcionários) ---
// ===================================

function showInternalPage(pageId) {
    document.querySelectorAll('.internal-page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageId}-page`).classList.add('active');

    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-page') === pageId) {
            tab.classList.add('active');
        }
    });

    if (pageId === 'roteiro') renderizarRoteiro();
    if (pageId === 'maquinarios') {
        // Correção: Carrega as opções e renderiza a lista ao entrar na aba Maquinários
        loadProfissionaisOptions();
        renderMaquinariosList(); 
    }
    if (pageId === 'funcionarios') {
        // Já renderiza a lista ao entrar na aba Funcionários
        renderFuncionariosList();
    }
}


// ===================================
// --- ROTEIRO DE PRODUÇÃO ---
// ===================================

function buscarTempoItem(item, tamanhoPoste, tipoFlange) {
    let temposArray = [];
    
    if (item.dependeFlange) {
        temposArray = tipoFlange === 'flang' ? item.temposFlang : item.temposEng;
    } else if (item.dependeMedidas) {
        temposArray = item.tempos;
    } else {
        // Item Fixo (Pega a primeira faixa)
        return { setup: item.tempos[0].setup, operacao: item.tempos[0].operacao };
    }

    if (!tamanhoPoste) return { setup: 0, operacao: 0 };
    
    const faixa = temposArray.find(t => tamanhoPoste >= t.min && tamanhoPoste <= t.max);

    return faixa ? { setup: faixa.setup, operacao: faixa.operacao } : { setup: 0, operacao: 0 };
}

function renderizarRoteiro() {
    const roteiroDiv = document.getElementById('roteiroAtual');
    const tamanhoPoste = parseFloat(document.getElementById('tamanhoPoste').value);
    const tipoFlange = document.getElementById('tipoFlange').value;
    roteiroDiv.innerHTML = '';
    
    if (roteiroProducao.length === 0) {
        roteiroDiv.innerHTML = '<p style="color: #6c757d;">Selecione os itens acima e clique em "Adicionar ao Roteiro".</p>';
    }

    let totalSetup = 0;
    let totalOperacao = 0;
    let setupItensConjunto = 0; // Setup só conta para o primeiro item de um conjunto
    let firstItemOfGroup = true;
    let custoPorProfissional = {};

    roteiroProducao.forEach((item, index) => {
        const itemBase = itensRoteiro.find(i => i.id === item.id);
        const profissional = itemBase ? funcionarios.find(f => f.id === itemBase.profissionalId) : null;
        const maquinario = itemBase ? maquinarios.find(m => m.id === itemBase.maquinarioId) : null;
        
        const tempos = buscarTempoItem(itemBase, tamanhoPoste, tipoFlange);
        const tempoTotalMin = tempos.setup + tempos.operacao;

        // Se for Operação em Conjunto (e não for o primeiro item do grupo), zera o setup para a soma total.
        let setupParaSoma = tempos.setup;
        if (itemBase && itemBase.operacaoConjunto) {
            if (firstItemOfGroup) {
                setupItensConjunto = tempos.setup;
                firstItemOfGroup = false;
            } else {
                setupParaSoma = 0;
            }
        } else {
            // Se não é conjunto, reseta o grupo
            firstItemOfGroup = true;
        }

        totalSetup += setupParaSoma;
        totalOperacao += tempos.operacao;

        // Cálculo do Custo de Mão de Obra
        if (profissional) {
            const custoHora = profissional.custoHora;
            const custoTotal = (tempoTotalMin / 60) * custoHora; // (Minutos / 60) * CustoHora

            if (!custoPorProfissional[profissional.id]) {
                custoPorProfissional[profissional.id] = { 
                    nome: profissional.nome, 
                    custoHora: custoHora, 
                    tempoTotalMin: 0, 
                    custoTotal: 0 
                };
            }
            
            custoPorProfissional[profissional.id].tempoTotalMin += tempoTotalMin;
            custoPorProfissional[profissional.id].custoTotal += custoTotal;
        }

        const div = document.createElement('div');
        div.classList.add('roteiro-item');
        div.innerHTML = `
            <div>
                <strong>${itemBase.nome}</strong> 
                <p class="tempo-info">
                    Setor: ${itemBase.setor || 'N/A'} 
                    | Profissional: ${profissional ? profissional.nome : 'N/A'} 
                    | Máquina: ${maquinario ? maquinario.nome : 'N/A'}
                </p>
            </div>
            <div>
                <span class="tempo-info">Setup: ${tempos.setup.toFixed(1)} min</span> | 
                <span class="tempo-info">Operação: ${tempos.operacao.toFixed(1)} min</span> | 
                <span class="tempo-info">Total: ${tempoTotalMin.toFixed(1)} min</span>
            </div>
            <div>
                <button class="btn-remover" onclick="removerItemRoteiro(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        roteiroDiv.appendChild(div);
    });
    
    // Recalcula o total de setup considerando itens em conjunto
    const totalTempoFinalMin = totalSetup + totalOperacao;
    custoCalculadoMOD = Object.values(custoPorProfissional).reduce((sum, p) => sum + p.custoTotal, 0);
    tempoCalculadoTotalMin = totalTempoFinalMin;

    renderizarResultado(totalTempoFinalMin, custoCalculadoMOD, custoPorProfissional);
}

function renderizarResultado(totalTempoMin, custoMOD, custoPorProfissional) {
    const resultadoDiv = document.getElementById('resultado');
    const tempoHoras = (totalTempoMin / 60).toFixed(2);
    
    const profissionalBreakdown = Object.values(custoPorProfissional).map(p => {
        const tempoHorasProf = (p.tempoTotalMin / 60).toFixed(2);
        return `
            <div class="breakdown-item">
                <span>${p.nome} (Custo/Hora: ${formatarMoeda(p.custoHora)})</span>
                <span>Tempo: ${p.tempoTotalMin.toFixed(1)} min (${tempoHorasProf}h) | Custo: ${formatarMoeda(p.custoTotal)}</span>
            </div>
        `;
    }).join('');

    // MODIFICAÇÃO: Adiciona o botão de associação e o container para seleção do produto
    resultadoDiv.innerHTML = `
        <h2>Tempo e Custo Total de Mão de Obra</h2>
        <p>Tempo Total (Setup + Operação): <span class="detalhe-tempo">${totalTempoMin.toFixed(1)}</span> minutos (${tempoHoras} horas)</p>
        <p>Custo Total de Mão de Obra (M.O.D.): <span class="detalhe-tempo">${formatarMoeda(custoMOD)}</span></p>
        
        <div class="professional-breakdown">
            <strong>Detalhe da Mão de Obra (Tempo e Custo por Profissional):</strong>
            ${profissionalBreakdown}
        </div>
        
        <button class="btn-primary" style="margin-top: 15px;" onclick="prepararAssociacaoRoteiro(${custoMOD})"> 
            Associar Roteiro ao Produto
        </button>
        
        <div id="associacao-produto-container" style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px; display: none;">
            </div>
    `;
}

// ====================================================================
// --- NOVAS FUNÇÕES DE ASSOCIAÇÃO DO ROTEIRO (Conforme solicitado) ---
// ====================================================================

/** * Prepara a interface de seleção de produto para associar o custo MOD.
 * @param {number} custoMOD - O custo total de MOD calculado no roteiro.
 */
function prepararAssociacaoRoteiro(custoMOD) {
    const container = document.getElementById('associacao-produto-container');
    container.style.display = 'block';

    // Simulação da barra de busca de produtos com uma lista de seleção simples
    const produtosOptions = produtos.map(p => 
        `<option value="${p.id}">${p.nome} (SKU: ${p.sku})</option>`
    ).join('');

    container.innerHTML = `
        <h4>Selecione o Produto para Associar (Custo MOD: ${formatarMoeda(custoMOD)}):</h4>
        <select id="select-produto-roteiro" class="input-full-width" style="margin-bottom: 10px;">
            <option value="">Buscar e Selecionar Produto</option>
            ${produtosOptions}
        </select>
        <button class="btn-success" onclick="finalizarAssociacaoRoteiro(${custoMOD})">Confirmar Associação</button>
        <button class="btn-secondary" onclick="document.getElementById('associacao-produto-container').style.display = 'none'">Cancelar</button>
    `;
    
    // Rola para a área de seleção
    container.scrollIntoView({ behavior: 'smooth' });
}

/** * Finaliza a associação, pegando o ID do produto selecionado.
 * @param {number} custoMOD - O custo total de MOD calculado no roteiro.
 */
function finalizarAssociacaoRoteiro(custoMOD) {
    const produtoId = document.getElementById('select-produto-roteiro').value;

    if (!produtoId) {
        alert('Por favor, selecione um produto.');
        return;
    }

    associarCustoAoProduto(produtoId, custoMOD);
    
    // Esconde a área de seleção
    document.getElementById('associacao-produto-container').style.display = 'none';
}

/**
 * Atribui o novo custo MOD ao produto e recalcula o custo total.
 * @param {string} produtoId - ID do produto a ser atualizado.
 * @param {number} novoCustoMod - O novo custo de Mão de Obra.
 */
function associarCustoAoProduto(produtoId, novoCustoMod) {
    const index = produtos.findIndex(p => p.id === produtoId);
    if (index !== -1) {
        let produto = produtos[index];
        
        // Garante que o produto tem o custo da Matéria Prima, caso contrário, assume 0.
        const custoMateriaPrima = produto.custoMateriaPrima || 0; 
        
        // Atualiza os novos campos e o custo total
        produto.custoMODRoteiro = novoCustoMod; // Custo de MOD Real calculado
        produto.custoTotalEstimado = custoMateriaPrima + novoCustoMod; // Custo Total Real
        
        // Atualiza o campo original de custoTotal (para compatibilidade com outras listas)
        produto.custoTotal = produto.custoTotalEstimado;
        
        setStorageData('produtos', produtos);
        alert(`Roteiro associado! O custo total do produto ${produto.nome} foi atualizado para ${formatarMoeda(produto.custoTotalEstimado)} (Custo MOD Real: ${formatarMoeda(novoCustoMod)}).`);
        
        // Recarrega a lista de produtos (caso o usuário volte para a página de Produtos)
        renderProdutosList(); 
    } else {
        alert('Produto não encontrado para associação.');
    }
}

function adicionarItemRoteiro(itemId) {
    const itemBase = itensRoteiro.find(i => i.id === itemId);
    if (!itemBase) return;
    
    // Adiciona o item ao roteiro de produção
    roteiroProducao.push({
        id: itemId,
        instanciaId: generateId() // ID único para a instância no roteiro
    });
    
    // Lógica de adição automática de itens (Soldagem Base e Acabamento) se for Flangeado
    const tipoFlange = document.getElementById('tipoFlange').value;
    if (itemId === 'plasma' && tipoFlange === 'flang') {
        ITENS_AUTO_FLANG.forEach(autoId => {
            if (!roteiroProducao.some(item => item.id === autoId)) {
                 roteiroProducao.push({
                    id: autoId,
                    instanciaId: generateId()
                });
            }
        });
    }

    renderizarRoteiro();
}

function removerItemRoteiro(index) {
    roteiroProducao.splice(index, 1);
    renderizarRoteiro();
}


// ===================================
// --- GESTÃO DE ITENS DE ROTEIRO (Base de Dados) ---
// ===================================

function renderizarItensDisponiveis() {
    const itensDiv = document.getElementById('itensDisponiveis');
    itensDiv.innerHTML = '';

    if (itensRoteiro.length === 0) {
        itensDiv.innerHTML = '<p style="color: #6c757d;">Nenhum item de roteiro cadastrado.</p>';
        return;
    }
    
    itensRoteiro.forEach((item, index) => {
        const profissional = funcionarios.find(f => f.id === item.profissionalId);
        const maquinario = maquinarios.find(m => m.id === item.maquinarioId);
        
        let infoTempo = '';
        if (item.dependeFlange) {
            infoTempo = 'Tempo Variável (Flange/Engastado)';
        } else if (item.dependeMedidas) {
            infoTempo = 'Tempo Variável (Medidas)';
        } else {
            infoTempo = 'Tempo Fixo';
        }

        const div = document.createElement('div');
        div.classList.add('item-config');
        div.innerHTML = `
            <span>${item.nome}</span>
            <span>${profissional ? profissional.nome : 'N/A'}</span>
            <span>${maquinario ? maquinario.nome : 'Nenhum'}</span>
            <span>${infoTempo} ${item.operacaoConjunto ? ' (Conjunto)' : ''}</span>
            <span style="grid-column: span 2; text-align: right;">
                <button class="btn-editar" onclick="abrirModalEdicao('${item.id}')"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-adicionar" onclick="adicionarItemRoteiro('${item.id}')"><i class="fas fa-plus"></i> Adicionar ao Roteiro</button>
                <button class="btn-remover" onclick="deletarItemRoteiro('${item.id}')"><i class="fas fa-trash"></i></button>
            </span>
        `;
        itensDiv.appendChild(div);
    });
    
    // Sempre renderiza o roteiro ao renderizar os itens
    renderizarRoteiro();
    loadProfissionaisOptions();
    loadMaquinariosOptions();
}

function deletarItemRoteiro(itemId) {
    if (confirm('Tem certeza que deseja excluir este item de roteiro?')) {
        itensRoteiro = itensRoteiro.filter(item => item.id !== itemId);
        setStorageData('itensRoteiro', itensRoteiro);
        renderizarItensDisponiveis();
    }
}


// ===================================
// --- MODAL DE ITEM DE ROTEIRO ---
// ===================================

let isEditing = false;
let currentItemId = null;

function abrirModalAdicionar() {
    isEditing = false;
    currentItemId = null;
    document.getElementById('itemModal').style.display = 'block';
    document.querySelector('#itemModal h2').textContent = 'Adicionar Novo Item';
    resetModalForm();
    loadProfissionaisOptions();
    loadMaquinariosOptions();
    toggleTabelaTempo(); // Garante o estado inicial da tabela
}

function abrirModalEdicao(itemId) {
    isEditing = true;
    currentItemId = itemId;
    const item = itensRoteiro.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('itemModal').style.display = 'block';
    document.querySelector('#itemModal h2').textContent = 'Editar Item';
    resetModalForm();
    loadProfissionaisOptions();
    loadMaquinariosOptions();

    // Preencher o formulário
    document.getElementById('modalNome').value = item.nome;
    document.getElementById('modalSetor').value = item.setor;
    document.getElementById('modalProfissionalId').value = item.profissionalId || '';
    document.getElementById('modalMaquinarioId').value = item.maquinarioId || '';
    
    document.getElementById('modalDependeMedidas').checked = item.dependeMedidas;
    document.getElementById('modalDependeFlange').checked = item.dependeFlange;
    document.getElementById('modalOperacaoConjunto').checked = item.operacaoConjunto || false;
    
    toggleTabelaTempo(); 
    
    // Preencher tempos
    if (item.dependeFlange) {
        // Flangeado
        document.getElementById('modalFlangSetup1').value = item.temposFlang[0].setup;
        document.getElementById('modalFlangOperacao1').value = item.temposFlang[0].operacao;
        document.getElementById('modalFlangSetup2').value = item.temposFlang[1].setup;
        document.getElementById('modalFlangOperacao2').value = item.temposFlang[1].operacao;
        document.getElementById('modalFlangSetup3').value = item.temposFlang[2].setup;
        document.getElementById('modalFlangOperacao3').value = item.temposFlang[2].operacao;
        
        // Engastado
        document.getElementById('modalEngSetup1').value = item.temposEng[0].setup;
        document.getElementById('modalEngOperacao1').value = item.temposEng[0].operacao;
        document.getElementById('modalEngSetup2').value = item.temposEng[1].setup;
        document.getElementById('modalEngOperacao2').value = item.temposEng[1].operacao;
        document.getElementById('modalEngSetup3').value = item.temposEng[2].setup;
        document.getElementById('modalEngOperacao3').value = item.temposEng[2].operacao;

    } else if (item.dependeMedidas) {
        // Medidas (Simples)
        document.getElementById('modalSetup1').value = item.tempos[0].setup;
        document.getElementById('modalOperacao1').value = item.tempos[0].operacao;
        document.getElementById('modalSetup2').value = item.tempos[1].setup;
        document.getElementById('modalOperacao2').value = item.tempos[1].operacao;
        document.getElementById('modalSetup3').value = item.tempos[2].setup;
        document.getElementById('modalOperacao3').value = item.tempos[2].operacao;
    } else {
        // Fixo
        document.getElementById('modalSetup1').value = item.tempos[0].setup;
        document.getElementById('modalOperacao1').value = item.tempos[0].operacao;
    }
}

function fecharModal() {
    document.getElementById('itemModal').style.display = 'none';
}

function resetModalForm() {
    document.getElementById('modalNome').value = '';
    document.getElementById('modalSetor').value = '';
    document.getElementById('modalProfissionalId').value = '';
    document.getElementById('modalMaquinarioId').value = '';
    document.getElementById('modalDependeMedidas').checked = false;
    document.getElementById('modalDependeFlange').checked = false;
    document.getElementById('modalOperacaoConjunto').checked = false;
    
    // Reseta todos os campos de tempo
    const inputs = document.querySelectorAll('#tabelaTempoModal input[type="number"]');
    inputs.forEach(input => input.value = 0);
    
    toggleTabelaTempo();
}

function toggleTabelaTempo() {
    const dependeMedidas = document.getElementById('modalDependeMedidas').checked;
    const dependeFlange = document.getElementById('modalDependeFlange').checked;
    const simples = document.getElementById('tabelaTempoSimples');
    const dual = document.getElementById('tabelaTempoDual');
    const row4a6 = document.getElementById('row4a6');
    const row6a12 = document.getElementById('row6a12');
    
    if (dependeFlange) {
        simples.style.display = 'none';
        dual.style.display = 'block';
    } else {
        dual.style.display = 'none';
        simples.style.display = 'block';
        
        if (dependeMedidas) {
            // Variável por Medida (3 faixas)
            document.querySelector('#tabelaTempoSimples .tempo-grid span').textContent = '1 a 3.9m:';
            row4a6.style.display = 'grid';
            row6a12.style.display = 'grid';
        } else {
            // Fixo (1 faixa)
            document.querySelector('#tabelaTempoSimples .tempo-grid span').textContent = 'Fixo:';
            row4a6.style.display = 'none';
            row6a12.style.display = 'none';
        }
    }
}

function salvarItem() {
    const nome = document.getElementById('modalNome').value.trim();
    const setor = document.getElementById('modalSetor').value.trim();
    const profissionalId = document.getElementById('modalProfissionalId').value || null;
    const maquinarioId = document.getElementById('modalMaquinarioId').value || null;
    const dependeMedidas = document.getElementById('modalDependeMedidas').checked;
    const dependeFlange = document.getElementById('modalDependeFlange').checked;
    const operacaoConjunto = document.getElementById('modalOperacaoConjunto').checked;

    if (!nome || !setor || !profissionalId) {
        alert('Nome, Setor e Profissional são obrigatórios!');
        return;
    }
    
    let newItem = {
        id: currentItemId || generateId(),
        nome,
        setor,
        profissionalId,
        maquinarioId,
        dependeMedidas,
        dependeFlange,
        operacaoConjunto
    };
    
    if (dependeFlange) {
        // Tempos para Flangeado
        newItem.temposFlang = [
            { min: 1, max: 3.9, setup: parseFloat(document.getElementById('modalFlangSetup1').value) || 0, operacao: parseFloat(document.getElementById('modalFlangOperacao1').value) || 0 },
            { min: 4, max: 6, setup: parseFloat(document.getElementById('modalFlangSetup2').value) || 0, operacao: parseFloat(document.getElementById('modalFlangOperacao2').value) || 0 },
            { min: 6.1, max: 12, setup: parseFloat(document.getElementById('modalFlangSetup3').value) || 0, operacao: parseFloat(document.getElementById('modalFlangOperacao3').value) || 0 }
        ];
        // Tempos para Engastado
        newItem.temposEng = [
            { min: 1, max: 3.9, setup: parseFloat(document.getElementById('modalEngSetup1').value) || 0, operacao: parseFloat(document.getElementById('modalEngOperacao1').value) || 0 },
            { min: 4, max: 6, setup: parseFloat(document.getElementById('modalEngSetup2').value) || 0, operacao: parseFloat(document.getElementById('modalEngOperacao2').value) || 0 },
            { min: 6.1, max: 12, setup: parseFloat(document.getElementById('modalEngSetup3').value) || 0, operacao: parseFloat(document.getElementById('modalEngOperacao3').value) || 0 }
        ];
        newItem.tempos = []; // Limpa o array simples
    } else if (dependeMedidas) {
        // Tempos Variáveis por Medida (3 faixas)
        newItem.tempos = [
            { min: 1, max: 3.9, setup: parseFloat(document.getElementById('modalSetup1').value) || 0, operacao: parseFloat(document.getElementById('modalOperacao1').value) || 0 },
            { min: 4, max: 6, setup: parseFloat(document.getElementById('modalSetup2').value) || 0, operacao: parseFloat(document.getElementById('modalOperacao2').value) || 0 },
            { min: 6.1, max: 12, setup: parseFloat(document.getElementById('modalSetup3').value) || 0, operacao: parseFloat(document.getElementById('modalOperacao3').value) || 0 }
        ];
        newItem.temposFlang = [];
        newItem.temposEng = [];
    } else {
        // Tempos Fixos (1 faixa)
        newItem.tempos = [
            { min: 1, max: 12, setup: parseFloat(document.getElementById('modalSetup1').value) || 0, operacao: parseFloat(document.getElementById('modalOperacao1').value) || 0 }
        ];
        newItem.temposFlang = [];
        newItem.temposEng = [];
    }


    if (isEditing) {
        const index = itensRoteiro.findIndex(item => item.id === currentItemId);
        if (index !== -1) {
            itensRoteiro[index] = newItem;
        }
    } else {
        itensRoteiro.push(newItem);
    }
    
    setStorageData('itensRoteiro', itensRoteiro);
    fecharModal();
    renderizarItensDisponiveis();
}


// ===================================
// --- MAQUINÁRIOS ---
// ===================================

document.getElementById('maquinario-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const nome = document.getElementById('maquinarioNome').value.trim();
    const setor = document.getElementById('maquinarioSetor').value;
    const profissionalId = document.getElementById('maquinarioProfissionalId').value;
    
    const novoMaquinario = {
        id: generateId(),
        nome: nome,
        setor: setor,
        profissionalId: profissionalId,
    };
    
    maquinarios.push(novoMaquinario);
    setStorageData('maquinariosRoteiro', maquinarios);
    renderMaquinariosList();
    this.reset();
    // Atualiza opções em outros lugares
    loadMaquinariosOptions(); 
});

function loadProfissionaisOptions() {
    const selects = document.querySelectorAll('#maquinarioProfissionalId, #modalProfissionalId');
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Selecione um Funcionário</option>';

        funcionarios.forEach(func => {
            const option = document.createElement('option');
            option.value = func.id;
            option.textContent = `${func.nome} (Custo/Hora: ${formatarMoeda(func.custoHora)})`;
            select.appendChild(option);
        });
        select.value = currentValue; // Mantém a seleção se possível
    });
}

function loadMaquinariosOptions() {
    const select = document.getElementById('modalMaquinarioId');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Nenhum Maquinário</option>';

    maquinarios.forEach(maq => {
        const option = document.createElement('option');
        option.value = maq.id;
        option.textContent = `${maq.nome} (${maq.setor})`;
        select.appendChild(option);
    });
    select.value = currentValue; // Mantém a seleção se possível
}

function renderMaquinariosList() {
    const tbody = document.getElementById('maquinarios-list');
    tbody.innerHTML = '';

    maquinarios.forEach(maq => {
        const profissional = funcionarios.find(f => f.id === maq.profissionalId);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${maq.nome}</td>
            <td>${maq.setor}</td>
            <td>${profissional ? profissional.nome : 'N/A'}</td>
            <td class="actions-cell">
                <button class="btn-remover" onclick="deleteMaquinario('${maq.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteMaquinario(id) {
    if (confirm('Tem certeza que deseja excluir este maquinário?')) {
        maquinarios = maquinarios.filter(m => m.id !== id);
        setStorageData('maquinariosRoteiro', maquinarios);
        renderMaquinariosList();
        loadMaquinariosOptions();
    }
}


// ===================================
// --- FUNCIONÁRIOS (Mão de Obra) ---
// ===================================

// Calcula o custo/hora a partir do salário (considerando 220h/mês)
function calcularCustoHora() {
    const salarioInput = document.getElementById('funcionarioSalario');
    const display = document.getElementById('custoHoraDisplay');
    const salario = parseFloat(salarioInput.value) || 0;
    const custoHora = salario / 220; // 220 horas mensais padrão
    
    display.textContent = `Custo/Hora: ${formatarMoeda(custoHora)} (Salário / 220h)`;
}

document.getElementById('funcionario-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const nome = document.getElementById('funcionarioNome').value.trim();
    const salarioMensal = parseFloat(document.getElementById('funcionarioSalario').value);
    const custoHora = salarioMensal / 220;
    
    const novoFuncionario = {
        id: generateId(),
        nome: nome,
        salarioMensal: salarioMensal,
        custoHora: custoHora,
    };
    
    funcionarios.push(novoFuncionario);
    setStorageData('funcionariosRoteiro', funcionarios);
    renderFuncionariosList();
    // Atualiza opções em outros lugares
    loadProfissionaisOptions(); 
    this.reset();
    calcularCustoHora(); // Limpa o display
});

function renderFuncionariosList() {
    const tbody = document.getElementById('funcionarios-list');
    tbody.innerHTML = '';
    
    if (funcionarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Nenhum funcionário cadastrado.</td></tr>';
        return;
    }

    funcionarios.forEach(func => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${func.nome}</td>
            <td>${formatarMoeda(func.salarioMensal)}</td>
            <td>${formatarMoeda(func.custoHora)}</td>
            <td class="actions-cell">
                <button class="btn-remover" onclick="deleteFuncionario('${func.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteFuncionario(id) {
    if (confirm('Tem certeza que deseja excluir este funcionário?')) {
        // Verifica se o profissional está em uso em algum maquinário
        const maquinariosEmUso = maquinarios.filter(m => m.profissionalId === id);
        if (maquinariosEmUso.length > 0) {
            alert(`Não é possível excluir o profissional. Ele está associado aos seguintes maquinários: ${maquinariosEmUso.map(m => m.nome).join(', ')}.`);
            return;
        }
        
        // Verifica se o profissional está em uso em algum item de roteiro
        const itensEmUso = itensRoteiro.filter(item => item.profissionalId === id);
        if (itensEmUso.length > 0) {
            alert(`Não é possível excluir o profissional. Ele está associado aos seguintes itens de roteiro: ${itensEmUso.map(item => item.nome).join(', ')}.`);
            return;
        }

        funcionarios = funcionarios.filter(f => f.id !== id);
        setStorageData('funcionariosRoteiro', funcionarios);
        renderFuncionariosList();
        loadProfissionaisOptions();
    }
}


// ===================================
// --- LÓGICA DE INICIALIZAÇÃO DE CONTEÚDO ---
// ===================================

function toggleContentVisibility() {
     const content = document.getElementById('main-content');
     const alert = document.getElementById('product-alert');
     const prodNome = document.getElementById('produto-selecionado');
     
     // Simulação de Habilitação do Produto (Apenas para demonstração)
     // O Módulo Roteiros só é exibido se um produto estiver "selecionado"
     produtoSelecionado.ativo = true; 

     if (produtoSelecionado && produtoSelecionado.ativo) {
         content.style.display = 'block';
         alert.style.display = 'none';
         prodNome.textContent = `(Produto ID: ${produtoSelecionado.id} - ${produtoSelecionado.nome})`;
     } else {
         content.style.display = 'none';
         alert.style.display = 'block';
         prodNome.textContent = '';
     }
}


// ====================================================================
// --- INICIALIZAÇÃO ---\
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Adiciona evento de navegação para todos os links do menu lateral
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            showPage(pageId);
        });
    });
    
    // **NOVO**: Adiciona evento de navegação para as abas internas do Módulo Roteiros
    document.querySelectorAll('#roteiros-page .nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            showInternalPage(tab.getAttribute('data-page'));
        });
    });
    
    // Inicializa a página de dashboard ao carregar
    showPage('dashboard');
});