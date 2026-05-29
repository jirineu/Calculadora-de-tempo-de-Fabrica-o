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
// START
// ======================================

async function startApp(){

  await initializeDatabase();

  renderForm();

  renderTable();

}

startApp();