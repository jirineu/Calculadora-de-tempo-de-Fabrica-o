// ======================================
// BANCO DE DADOS
// ======================================

let database = {
  columns: [],
  rows: [],
  nextId: 1
};

// ======================================
// CONFIG
// ======================================

const STORAGE_KEY = "lista_database";

// FUTURA API GOOGLE SHEETS
const API_URL = "COLE_SUA_URL_AQUI";

// ======================================
// ELEMENTOS
// ======================================

const columnName = document.getElementById("columnName");
const columnType = document.getElementById("columnType");

const addColumnBtn = document.getElementById("addColumnBtn");

const rowForm = document.getElementById("rowForm");

const saveRowBtn = document.getElementById("saveRowBtn");

const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");

const clearBtn = document.getElementById("clearBtn");

const deleteBtn = document.getElementById("deleteBtn");
const deleteIdInput = document.getElementById("deleteId");

// ======================================
// CONTROLE DE EDIÇÃO
// ======================================

let currentEditId = null;

// ======================================
// LOCAL STORAGE
// ======================================

function saveLocalDatabase(){

  try{

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(database)
    );

  } catch(error){

    console.error(
      "Erro ao salvar localStorage:",
      error
    );

  }

}

function loadLocalDatabase(){

  try{

    const data = localStorage.getItem(STORAGE_KEY);

    if(!data) return;

    const parsed = JSON.parse(data);

    if(
      typeof parsed === "object" &&
      parsed.columns &&
      parsed.rows
    ){

      database = parsed;

    }

  } catch(error){

    console.error(
      "Erro ao carregar localStorage:",
      error
    );

    localStorage.removeItem(STORAGE_KEY);

  }

}

// ======================================
// API GOOGLE SHEETS
// ======================================

async function postData(payload){

  try{

    // FUTURO

    /*
    await fetch(API_URL, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(payload)

    });
    */

    console.log(
      "POST preparado:",
      payload
    );

  } catch(error){

    console.error(
      "Erro POST:",
      error
    );

  }

}

async function getData(){

  try{

    // FUTURO

    /*
    const response = await fetch(API_URL);

    const data = await response.json();

    return data;
    */

    console.log("GET preparado");

    return null;

  } catch(error){

    console.error(
      "Erro GET:",
      error
    );

    return null;

  }

}

// ======================================
// SALVAMENTO GLOBAL
// ======================================

async function saveDatabase(){

  saveLocalDatabase();

  await postData(database);

}

// ======================================
// INICIALIZAÇÃO
// ======================================

async function initializeDatabase(){

  const apiData = await getData();

  if(apiData){

    database = apiData;

    saveLocalDatabase();

  } else {

    loadLocalDatabase();

  }

}

// ======================================
// ADICIONAR COLUNA
// ======================================

addColumnBtn.addEventListener(
  "click",
  async () => {

    const name = columnName.value.trim();
    const type = columnType.value;

    if(!name){

      alert("Digite o nome da coluna.");
      return;

    }

    database.columns.push({
      name,
      type
    });

    columnName.value = "";

    await saveDatabase();

    renderForm();
    renderTable();

  }
);

// ======================================
// FORMULÁRIO
// ======================================

function renderForm(data = null){

  rowForm.innerHTML = "";

  if(database.columns.length === 0){

    rowForm.innerHTML = `
      <p class="sem-dados">
        Crie uma coluna primeiro.
      </p>
    `;

    return;

  }

  database.columns.forEach(
    (column, index) => {

      const div = document.createElement("div");
      div.classList.add("campo");

      const label = document.createElement("label");
      label.innerText = column.name;

      const input = document.createElement("input");

      input.type = column.type;

      input.placeholder =
        `Digite ${column.name}`;

      if(data){

        input.value = data[index];

      }

      div.appendChild(label);
      div.appendChild(input);

      rowForm.appendChild(div);

    }
  );

}

// ======================================
// SALVAR LINHA
// ======================================

saveRowBtn.addEventListener(
  "click",
  async () => {

    if(database.columns.length === 0){

      alert(
        "Crie uma coluna primeiro."
      );

      return;

    }

    const inputs =
      rowForm.querySelectorAll("input");

    const values = [];

    let vazio = false;

    inputs.forEach(input => {

      if(input.value.trim() === ""){

        vazio = true;

      }

      values.push(input.value);

    });

    if(vazio){

      alert("Preencha todos os campos.");

      return;

    }

    // EDITAR
    if(currentEditId !== null){

      const index =
        database.rows.findIndex(
          row => row.id === currentEditId
        );

      database.rows[index].data = values;

      currentEditId = null;

      saveRowBtn.innerText =
        "Salvar Linha";

    } else {

      // NOVA LINHA

      database.rows.push({

        id: database.nextId++,

        data: values,

        createdAt:
          new Date().toISOString()

      });

    }

    await saveDatabase();

    renderForm();
    renderTable();

  }
);

// ======================================
// TABELA
// ======================================

function renderTable(){

  tableHead.innerHTML = "";

  // ID

  const thId =
    document.createElement("th");

  thId.innerText = "ID";

  tableHead.appendChild(thId);

  // COLUNAS

  database.columns.forEach(column => {

    const th =
      document.createElement("th");

    th.innerText = column.name;

    tableHead.appendChild(th);

  });

  // AÇÕES

  const thAction =
    document.createElement("th");

  thAction.innerText = "Ações";

  tableHead.appendChild(thAction);

  // CORPO

  tableBody.innerHTML = "";

  if(database.rows.length === 0){

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="${database.columns.length + 2}"
          class="sem-dados"
        >
          Nenhuma linha cadastrada.
        </td>
      </tr>
    `;

    return;

  }

  database.rows.forEach(row => {

    const tr =
      document.createElement("tr");

    // ID

    const tdId =
      document.createElement("td");

    tdId.innerText = row.id;

    tr.appendChild(tdId);

    // DADOS

    row.data.forEach(value => {

      const td =
        document.createElement("td");

      td.innerText = value;

      tr.appendChild(td);

    });

    // AÇÕES

    const tdAction =
      document.createElement("td");

    const actions =
      document.createElement("div");

    actions.classList.add(
      "action-buttons"
    );

    // EDITAR

    const editBtn =
      document.createElement("button");

    editBtn.type = "button";

    editBtn.innerText = "Editar";

    editBtn.classList.add("edit-btn");

    editBtn.addEventListener(
      "click",
      () => {

        currentEditId = row.id;

        renderForm(row.data);

        saveRowBtn.innerText =
          "Atualizar Linha";

        window.scrollTo({

          top: 0,

          behavior: "smooth"

        });

      }
    );

    // EXCLUIR

    const deleteButton =
      document.createElement("button");

    deleteButton.type = "button";

    deleteButton.innerText = "Excluir";

    deleteButton.classList.add(
      "delete-btn"
    );

    deleteButton.addEventListener(
      "click",
      async () => {

        const confirmar = confirm(
          `Deseja excluir o ID ${row.id}?`
        );

        if(!confirmar) return;

        database.rows =
          database.rows.filter(
            item => item.id !== row.id
          );

        await saveDatabase();

        renderTable();

      }
    );

    actions.appendChild(editBtn);

    actions.appendChild(deleteButton);

    tdAction.appendChild(actions);

    tr.appendChild(tdAction);

    tableBody.appendChild(tr);

  });

}

// ======================================
// EXCLUIR POR ID
// ======================================

deleteBtn.addEventListener(
  "click",
  async () => {

    const id =
      Number(deleteIdInput.value);

    if(!id){

      alert("Digite um ID válido.");

      return;

    }

    const exists =
      database.rows.some(
        row => row.id === id
      );

    if(!exists){

      alert("ID não encontrado.");

      return;

    }

    database.rows =
      database.rows.filter(
        row => row.id !== id
      );

    deleteIdInput.value = "";

    await saveDatabase();

    renderTable();

  }
);

// ======================================
// LIMPAR TUDO
// ======================================

clearBtn.addEventListener(
  "click",
  async () => {

    const confirmar = confirm(
      "Deseja apagar tudo?"
    );

    if(!confirmar) return;

    database = {

      columns: [],

      rows: [],

      nextId: 1

    };

    currentEditId = null;

    await saveDatabase();

    renderForm();

    renderTable();

  }
);

// ======================================
// PDF
// ======================================

const openPdfModalBtn =
  document.getElementById(
    "openPdfModalBtn"
  );

const closePdfModalBtn =
  document.getElementById(
    "closePdfModalBtn"
  );

const pdfModal =
  document.getElementById(
    "pdfModal"
  );

const pdfFiltersContainer =
  document.getElementById(
    "pdfFiltersContainer"
  );

const addPdfFilterBtn =
  document.getElementById(
    "addPdfFilterBtn"
  );

const generatePdfBtn =
  document.getElementById(
    "generatePdfBtn"
  );

// ======================================
// ABRIR MODAL
// ======================================

function openPdfModal(){

  pdfModal.classList.add("active");

  if(
    pdfFiltersContainer.children.length === 0
  ){

    addPdfFilter();

  }

}

// ======================================
// FECHAR MODAL
// ======================================

function closePdfModal(){

  pdfModal.classList.remove("active");

}

// ======================================
// EVENTOS
// ======================================

openPdfModalBtn.addEventListener(
  "click",
  openPdfModal
);

closePdfModalBtn.addEventListener(
  "click",
  closePdfModal
);

// ======================================
// NOVO FILTRO
// ======================================

function addPdfFilter(){

  const filter =
    document.createElement("div");

  filter.classList.add("pdf-filter");

  // SELECT COLUNA

  const columnSelect =
    document.createElement("select");

  database.columns.forEach(
    column => {

      const option =
        document.createElement(
          "option"
        );

      option.value = column.name;

      option.innerText = column.name;

      columnSelect.appendChild(option);

    }
  );

  // INPUT VALOR

  const valueInput =
    document.createElement("input");

  valueInput.type = "text";

  valueInput.placeholder =
    "Valor para filtrar";

  // REMOVER FILTRO

  const removeBtn =
    document.createElement("button");

  removeBtn.type = "button";

  removeBtn.innerText = "Remover";

  removeBtn.classList.add(
    "pdf-filter-remove"
  );

  removeBtn.addEventListener(
    "click",
    () => {

      filter.remove();

    }
  );

  filter.appendChild(columnSelect);

  filter.appendChild(valueInput);

  filter.appendChild(removeBtn);

  pdfFiltersContainer.appendChild(
    filter
  );

}

// ======================================
// EVENTO NOVO FILTRO
// ======================================

addPdfFilterBtn.addEventListener(
  "click",
  addPdfFilter
);

// ======================================
// FILTRAR DADOS
// ======================================

function getFilteredRows(){

  const filters =
    pdfFiltersContainer.querySelectorAll(
      ".pdf-filter"
    );

  let filteredRows = [...database.rows];

  filters.forEach(filter => {

    const selects =
      filter.querySelector("select");

    const inputs =
      filter.querySelector("input");

    const columnName =
      selects.value;

    const filterValue =
      inputs.value
        .trim()
        .toLowerCase();

    if(filterValue === "") return;

    const columnIndex =
      database.columns.findIndex(
        column =>
          column.name === columnName
      );

    filteredRows =
      filteredRows.filter(row => {

        const value =
          String(
            row.data[columnIndex]
          ).toLowerCase();

        return value.includes(
          filterValue
        );

      });

  });

  return filteredRows;

}

// ======================================
// GERAR PDF
// ======================================

async function generatePDF(){

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF();

  const rows =
    getFilteredRows();

  let y = 20;

  // TÍTULO

  doc.setFontSize(18);

  doc.text(
    "Relatório da Tabela",
    14,
    y
  );

  y += 15;

  // CABEÇALHO

  doc.setFontSize(10);

  const headers = [
    "ID",
    ...database.columns.map(
      column => column.name
    )
  ];

  doc.text(
    headers.join(" | "),
    14,
    y
  );

  y += 10;

  // LINHAS

  rows.forEach(row => {

    const line = [

      row.id,

      ...row.data

    ];

    doc.text(
      line.join(" | "),
      14,
      y
    );

    y += 10;

    // NOVA PÁGINA

    if(y > 270){

      doc.addPage();

      y = 20;

    }

  });

  // DOWNLOAD

  doc.save(
    `relatorio-${Date.now()}.pdf`
  );

}

// ======================================
// EVENTO PDF
// ======================================

generatePdfBtn.addEventListener(
  "click",
  generatePDF
);

const openFilterPreviewBtn =
  document.getElementById("openFilterPreviewBtn");

const filterPreviewModal =
  document.getElementById("filterPreviewModal");

const filterPreviewTable =
  document.getElementById("filterPreviewTable");

const applyFilterBtn =
  document.getElementById("applyFilterBtn");

const closeFilterPreviewBtn =
  document.getElementById("closeFilterPreviewBtn");

// SMART TAB
const openSmartTabBtn =
  document.getElementById("openSmartTabBtn");

const smartModal =
  document.getElementById("smartModal");

const smartColumn =
  document.getElementById("smartColumn");

const smartOperation =
  document.getElementById("smartOperation");

const smartValue =
  document.getElementById("smartValue");

const calcSmartBtn =
  document.getElementById("calcSmartBtn");

const smartResult =
  document.getElementById("smartResult");

const closeSmartBtn =
  document.getElementById("closeSmartBtn");

openFilterPreviewBtn.onclick = () => {
  filterPreviewModal.classList.add("active");
  renderFilterPreview();
};

closeFilterPreviewBtn.onclick = () => {
  filterPreviewModal.classList.remove("active");
};

function renderFilterPreview() {

  const rows = getFilteredRows();

  let html = "<table><tr>";

  database.columns.forEach(c => {
    html += `<th>${c.name}</th>`;
  });

  html += "</tr>";

  rows.forEach(r => {
    html += "<tr>";
    r.data.forEach(d => {
      html += `<td>${d}</td>`;
    });
    html += "</tr>";
  });

  html += "</table>";

  filterPreviewTable.innerHTML = html;
};

applyFilterBtn.onclick = () => {

  renderTable(); // atualiza tabela principal

  alert("Filtro aplicado na tabela principal");

  filterPreviewModal.classList.remove("active");

};

openSmartTabBtn.onclick = () => {

  smartModal.classList.add("active");

  smartColumn.innerHTML = "";

  database.columns.forEach(c => {
    if(c.type === "number") {
      smartColumn.innerHTML += `<option>${c.name}</option>`;
    }
  });

};

closeSmartBtn.onclick = () => {
  smartModal.classList.remove("active");
};
calcSmartBtn.onclick = () => {

  const columnName = smartColumn.value;
  const operation = smartOperation.value;
  const extra = parseFloat(smartValue.value || 0);

  const index = database.columns.findIndex(c => c.name === columnName);

  const values = database.rows
    .map(r => parseFloat(r.data[index]))
    .filter(v => !isNaN(v));

  let result = 0;

  if(operation === "sum") {
    result = values.reduce((a,b) => a + b, 0);
  }

  if(operation === "avg") {
    result = values.reduce((a,b) => a + b, 0) / values.length;
  }

  if(operation === "mult") {
    result = values.reduce((a,b) => a * b, 1);
  }

  if(operation === "div") {
    result = values.reduce((a,b) => a / b);
  }

  if(operation === "percent") {
    result = (values.reduce((a,b) => a + b, 0) * extra) / 100;
  }

  smartResult.innerHTML = `
    <h3>Resultado: ${result}</h3>
  `;

};

// ======================================
// START
// ======================================

async function startApp(){

  await initializeDatabase();

  renderForm();

  renderTable();

}

startApp();

