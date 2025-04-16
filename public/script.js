let usarMock = false;
let paginaAtual = 1;
let itensPorPagina = 10000;
let inadimplenciasPorPagina = []; // Armazenar inadimplência por página
let todosOsDados = [];

document.getElementById('btnBuscar').addEventListener('click', async () => {
    paginaAtual = 1;
    inadimplenciasPorPagina = [];
    todosOsDados = [];
    await carregarTodasPaginas();
});

document.getElementById('alternarModo').addEventListener('click', async () => {
    usarMock = !usarMock;
    await atualizarModo();
});

document.getElementById('inadimplenciaTotal').addEventListener('click', () => {
    const detalhamento = document.getElementById('detalheInadimplencia');
    
    if (detalhamento.classList.contains('visivel')) {
        detalhamento.classList.remove('visivel');
        detalhamento.innerHTML = '';
    } else {
        detalhamento.classList.add('visivel');
        detalhamento.innerHTML = '<h3>Detalhamento por página</h3><ul>' + 
            inadimplenciasPorPagina.map((valor, i) =>
                `<li>Página ${i + 1}: ${formatarMoedaBR(valor)}</li>`
            ).join('') + '</ul>';
    }
});

function atualizarModo() {
    const texto = usarMock ? '(Usando MODO MOCK)' : '(Usando API REAL)';
    document.getElementById('modoAtual').innerText = texto;
}

async function carregarTodasPaginas() {
    atualizarEtapa("Carregando primeira página...");
    const primeiraPagina = await carregarPagina(1);
    const totalLinhas = primeiraPagina.resultado[1].Total || primeiraPagina.resultado.length;
    const totalPaginas = Math.ceil(totalLinhas / itensPorPagina);
    todosOsDados.push(...primeiraPagina.resultado);
    inadimplenciasPorPagina.push(primeiraPagina.inadimplencia);

    for (let i = 2; i <= totalPaginas; i++) {
        atualizarEtapa(`Carregando página ${i} de ${totalPaginas}...`);
        const pagina = await carregarPagina(i);
        todosOsDados.push(...pagina.resultado);
        inadimplenciasPorPagina.push(pagina.inadimplencia);
    }

    calcularTotais(todosOsDados);
    atualizarEtapa("Todos os dados carregados.");
}

async function carregarPagina(pagina) {
    atualizarEtapa(`Fazendo requisição da página ${pagina}...`);
    let dados;
    if (usarMock) {
        const resposta = await fetch('/mock-resposta');
        dados = await resposta.json();
    } else {
        const resposta = await fetch('/consulta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pagina })
        });
        dados = await resposta.json();
    }

    if (!dados.sucesso) {
        atualizarEtapa("Erro ao consultar dados.");
        return { resultado: [], inadimplencia: 0, totalLinhas: 0 };
    }

    const resultado = JSON.parse(dados.resultado);
    const inadimplenciaPagina = calcularInadimplenciaPagina(resultado);
    return {
        resultado,
        inadimplencia: inadimplenciaPagina,
        totalLinhas: dados.Total || resultado.length
    };
}

function atualizarEtapa(texto) {
    document.getElementById('etapa').innerText = texto;
}

function parseMoeda(valor) {
    if (typeof valor === 'string') {
        return parseFloat(valor.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    }
    return valor || 0;
}

function formatarMoedaBR(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    }).format(valor || 0);
}

function calcularInadimplenciaPagina(dados) {
    let inadimplencia = 0;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Ignorar hora

    for (const linha of dados) {
        const situacao = linha['Situação'];
        const vencimentoStr = linha['Vencimento'];
        const vencimento = vencimentoStr ? new Date(vencimentoStr.split('/').reverse().join('-')) : null;

        if (situacao !== "Liquidado (Paga)" && vencimento && vencimento < hoje) {
            inadimplencia += parseMoeda(linha['Valor Atualizado']);
        }
    }

    return parseFloat(inadimplencia.toFixed(2));
}

function calcularTotais(dados) {
    let total = 0, liquido = 0, melhorDesc = 0, valorDesc = 0, atualizado = 0, juros = 0, multa = 0;
    let inadimplencia = 0;

    let abertas = 0, restritas = 0, pagas = 0, atrasadas = 0;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Comparação só da data

    for (const linha of dados) {
        const situacao = linha['Situação'];
        const vencimentoStr = linha['Vencimento'];
        const vencimento = vencimentoStr ? new Date(vencimentoStr.split('/').reverse().join('-')) : null;

        total += parseMoeda(linha['Valor']);
        liquido += parseMoeda(linha['Valor Líquido']);
        melhorDesc += parseMoeda(linha['Valor c/ Melhor Desconto']);
        valorDesc += parseMoeda(linha['Valor do Melhor Desconto']);
        atualizado += parseMoeda(linha['Valor Atualizado']);
        juros += parseMoeda(linha['Juros']);
        multa += parseMoeda(linha['Multa']);

        if (situacao === "Em Aberto") abertas++;
        else if (situacao === "Restrita") restritas++;
        else if (situacao === "Liquidado (Paga)") pagas++;

        if (situacao !== "Liquidado (Paga)" && vencimento && vencimento < hoje) {
            inadimplencia += parseMoeda(linha['Valor Atualizado']);
            atrasadas++;
        }
    }

    document.getElementById('valorTotal').innerText = formatarMoedaBR(total.toFixed(2));
    document.getElementById('valorLiquido').innerText = formatarMoedaBR(liquido.toFixed(2));
    document.getElementById('melhorDesconto').innerText = formatarMoedaBR(melhorDesc.toFixed(2));
    document.getElementById('valorMelhorDesconto').innerText = formatarMoedaBR(valorDesc.toFixed(2));
    document.getElementById('valorAtualizado').innerText = formatarMoedaBR(atualizado.toFixed(2));
    document.getElementById('jurosMultas').innerText = formatarMoedaBR((juros + multa).toFixed(2));
    document.getElementById('inadimplenciaTotal').innerText = formatarMoedaBR(inadimplencia.toFixed(2));

    document.getElementById('parcelasAbertas').innerText = abertas;
    document.getElementById('parcelasRestritas').innerText = restritas;
    document.getElementById('parcelasPagas').innerText = pagas;
    document.getElementById('parcelasAtraso').innerText = atrasadas;
}
