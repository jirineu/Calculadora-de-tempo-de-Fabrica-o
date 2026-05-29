// script.js

const columns = [];
const rows = [];

const columnName = document.getElementById("columnName");
const columnType = document.getElementById("columnType");

const addColumnBtn = document.getElementById("addColumnBtn");
const addRowBtn = document.getElementById("addRowBtn");

const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");

const rowForm = document.getElementById("rowForm");
const clearBtn = document.getElementById("clearBtn");

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

// Criar formulário dinâmico
function renderForm(){

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
    input.dataset.index = index;

    div.appendChild(label);
    div.appendChild(input);

    rowForm.appendChild(div);

  });

}

// Adicionar linha
addRowBtn.addEventListener("click", () => {

  if(columns.length === 0){
    alert("Crie ao menos uma coluna.");
    return;
  }

  const inputs = rowForm.querySelectorAll("input");

  const rowData = [];

  let vazio = false;

  inputs.forEach(input => {

    if(input.value.trim() === ""){
      vazio = true;
    }

    rowData.push(input.value);

  });

  if(vazio){
    alert("Preencha todos os campos.");
    return;
  }

  rows.push(rowData);

  inputs.forEach(input => {
    input.value = "";
  });

  renderTable();

});

// Renderizar tabela
function renderTable(){

  // Cabeçalho
  tableHead.innerHTML = "";

  columns.forEach(column => {

    const th = document.createElement("th");
    th.innerText = column.name;

    tableHead.appendChild(th);

  });

  // Corpo
  tableBody.innerHTML = "";

  if(rows.length === 0){

    tableBody.innerHTML = `
      <tr>
        <td colspan="${columns.length || 1}" class="sem-dados">
          Nenhuma linha adicionada.
        </td>
      </tr>
    `;

    return;
  }

  rows.forEach(row => {

    const tr = document.createElement("tr");

    row.forEach(cell => {

      const td = document.createElement("td");
      td.innerText = cell;

      tr.appendChild(td);

    });

    tableBody.appendChild(tr);

  });

}

// Limpar tudo
clearBtn.addEventListener("click", () => {

  const confirmar = confirm("Deseja apagar tudo?");

  if(!confirmar) return;

  columns.length = 0;
  rows.length = 0;

  renderForm();
  renderTable();

});

// Inicialização
renderForm();
renderTable();