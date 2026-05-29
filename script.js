// script.js

const columns = [];
const rows = [];

let currentEditId = null;
let nextId = 1;

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

// Adicionar coluna
addColumnBtn.addEventListener("click", () => {

  const name = columnName.value.trim();
  const type = columnType.value;

  if(!name){
    alert("Digite o nome da coluna.");
    return;
  }

  columns.push({
    name,
    type
  });

  columnName.value = "";

  renderForm();
  renderTable();

});

// Criar formulário
function renderForm(data = null){

  rowForm.innerHTML = "";

  if(columns.length === 0){

    rowForm.innerHTML = `
      <p class="sem-dados">
        Crie uma coluna primeiro.
      </p>
    `;

    return;
  }

  columns.forEach((column, index) => {

    const div = document.createElement("div");
    div.classList.add("campo");

    const label = document.createElement("label");
    label.innerText = column.name;

    const input = document.createElement("input");

    input.type = column.type;
    input.placeholder = `Digite ${column.name}`;

    if(data){
      input.value = data[index];
    }

    div.appendChild(label);
    div.appendChild(input);

    rowForm.appendChild(div);

  });

}

// Salvar linha
saveRowBtn.addEventListener("click", () => {

  if(columns.length === 0){
    alert("Crie uma coluna primeiro.");
    return;
  }

  const inputs = rowForm.querySelectorAll("input");

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

  // Editar
  if(currentEditId !== null){

    const index = rows.findIndex(row => row.id === currentEditId);

    rows[index].data = values;

    currentEditId = null;

    saveRowBtn.innerText = "Salvar Linha";

  } else {

    // Criar nova linha
    rows.push({
      id: nextId++,
      data: values
    });

  }

  renderForm();
  renderTable();

});

// Renderizar tabela
function renderTable(){

  // Cabeçalho
  tableHead.innerHTML = "";

  const thId = document.createElement("th");
  thId.innerText = "ID";

  tableHead.appendChild(thId);

  columns.forEach(column => {

    const th = document.createElement("th");
    th.innerText = column.name;

    tableHead.appendChild(th);

  });

  const thAction = document.createElement("th");
  thAction.innerText = "Ações";

  tableHead.appendChild(thAction);

  // Corpo
  tableBody.innerHTML = "";

  if(rows.length === 0){

    tableBody.innerHTML = `
      <tr>
        <td colspan="${columns.length + 2}" class="sem-dados">
          Nenhuma linha cadastrada.
        </td>
      </tr>
    `;

    return;
  }

  rows.forEach(row => {

    const tr = document.createElement("tr");

    // ID
    const tdId = document.createElement("td");
    tdId.innerText = row.id;

    tr.appendChild(tdId);

    // Dados
    row.data.forEach(value => {

      const td = document.createElement("td");
      td.innerText = value;

      tr.appendChild(td);

    });

    // Ações
    const actionTd = document.createElement("td");

    const actions = document.createElement("div");
    actions.classList.add("action-buttons");

    // Editar
    const editBtn = document.createElement("button");

    editBtn.innerText = "Editar";
    editBtn.classList.add("edit-btn");

    editBtn.addEventListener("click", () => {

      currentEditId = row.id;

      renderForm(row.data);

      saveRowBtn.innerText = "Atualizar Linha";

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    });

    // Excluir
    const deleteBtn = document.createElement("button");

    deleteBtn.innerText = "Excluir";
    deleteBtn.classList.add("delete-btn");

    deleteBtn.addEventListener("click", () => {

      const confirmar = confirm(
        `Deseja excluir a linha ID ${row.id}?`
      );

      if(!confirmar) return;

      const index = rows.findIndex(item => item.id === row.id);

      rows.splice(index, 1);

      renderTable();

    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    actionTd.appendChild(actions);

    tr.appendChild(actionTd);

    tableBody.appendChild(tr);

  });

}

// Excluir por ID
deleteBtn.addEventListener("click", () => {

  const id = Number(deleteIdInput.value);

  if(!id){
    alert("Digite um ID válido.");
    return;
  }

  const index = rows.findIndex(row => row.id === id);

  if(index === -1){
    alert("ID não encontrado.");
    return;
  }

  rows.splice(index, 1);

  deleteIdInput.value = "";

  renderTable();

});

// Limpar tudo
clearBtn.addEventListener("click", () => {

  const confirmar = confirm(
    "Deseja apagar todas as colunas e linhas?"
  );

  if(!confirmar) return;

  columns.length = 0;
  rows.length = 0;

  currentEditId = null;
  nextId = 1;

  renderForm();
  renderTable();

});

// Inicialização
renderForm();
renderTable();