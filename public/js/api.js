const apiBaseUrl = "http://localhost:3000";

async function getParticipantesRoca() {
    const response = await fetch(`${apiBaseUrl}/participantes?naRoca=true`);
    if (!response.ok) {
        throw new Error(`Não foi possível carregar a roça (${response.status}).`);
    }
    return response.json();
}

async function getDemaisParticipantes() {
    const response = await fetch(`${apiBaseUrl}/participantes?naRoca=false`);
    if (!response.ok) {
        throw new Error(`Não foi possível carregar os demais participantes (${response.status}).`);
    }
    return response.json();
}

async function getVotos() {
    const response = await fetch(`${apiBaseUrl}/votos`);
    if (!response.ok) {
        throw new Error(`Não foi possível carregar os votos (${response.status}).`);
    }
    return response.json();
}

async function enviarVoto(participanteId) {
    const response = await fetch(`${apiBaseUrl}/votos`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            participanteId,
            data: new Date().toISOString()
        })
    });
    if (!response.ok) {
        throw new Error(`Não foi possível registrar o voto (${response.status}).`);
    }
    return response.json();
}

async function apagarVoto(id) {
    const response = await fetch(`${apiBaseUrl}/votos/${(id)}`, {
        method: "DELETE"
    });
    if (!response.ok) {
        throw new Error(`Não foi possível apagar o voto (${response.status}).`);
    }
    if (response.status !== 204) {
        return response.json();
    }
}

let votosRegistradosNestaSessao = 0;

function criarCard(podeVotar) {
    return `
        <div class="col">
            <article class="card h-100 bg-parchment border-${podeVotar ? "danger" : "light"} border-2 shadow">
                <div class="ratio ratio-16x9">
                    <img class="card-img-top object-fit-cover" alt="">
                </div>
                ${podeVotar ? '<span class="badge bg-danger position-absolute top-0 end-0 m-2 rounded-pill">Na roça</span>' : ""}
                <div class="card-body d-flex flex-column text-center p-2 p-md-3">
                    <h3 class="h5 card-title text-farm-wood mb-2"></h3>
                    ${podeVotar ? '<button class="btn btn-danger btn-sm fw-bold w-100 mt-auto" type="button">Votar para eliminar</button>' : ""}
                </div>
            </article>
        </div>`;
}

function preencherCards(elemento, participantes, podeVotar) {
    let cardsHTML = "";
    participantes.forEach(() => {
        cardsHTML += criarCard(podeVotar);
    });
    elemento.innerHTML = cardsHTML;
    const cards = elemento.getElementsByClassName("card");
    Array.from(cards).forEach((card, index) => {
        const participante = participantes[index];
        const imagem = card.getElementsByTagName("img")[0];
        imagem.src = participante.foto;
        imagem.alt = `Foto de ${participante.nome}`;
        card.getElementsByClassName("card-title")[0].textContent = participante.nome;
    });
    if (podeVotar) {
        const botoes = elemento.getElementsByTagName("button");
        Array.from(botoes).forEach((botao, index) => {
            botao.addEventListener("click", () => registrarVoto(participantes[index]));
        });
    }
}

function mostrarVotoRegistrado(nome) {
    const mensagem = document.getElementById("vote-message");
    if (!mensagem) {
        return;
    }

    mensagem.innerHTML = `
        <div class="alert alert-success d-flex flex-wrap justify-content-between align-items-center gap-2 mb-0" role="status">
            <span></span>
            <a class="alert-link text-nowrap" href="resultado.html">Ver resultado</a>
        </div>`;
    mensagem.getElementsByTagName("span")[0].textContent = `Voto registrado para eliminar ${nome}. Você já votou ${votosRegistradosNestaSessao} ${votosRegistradosNestaSessao === 1 ? "vez" : "vezes"} nesta sessão.`;
}

async function registrarVoto(participante) {
    try {
        await enviarVoto(participante.id);
        votosRegistradosNestaSessao += 1;
        mostrarVotoRegistrado(participante.nome);
    } catch (erro) {
        const mensagem = document.getElementById("vote-message");
        if (!mensagem) {
            return;
        }
        mensagem.innerHTML = '<div class="alert alert-danger mb-0" role="alert"></div>';
        mensagem.getElementsByClassName("alert")[0].textContent = `${erro.message} Verifique se o servidor está em execução e tente novamente.`;
    }
}

async function carregarParticipantesHome() {
    const listaRoca = document.getElementById("home-contestants-list");

    try {
        const participantesRoca = await getParticipantesRoca();
        let participantesHTML = "";
        participantesRoca.forEach(() => {
            participantesHTML += `
            <div class="col-auto">
                <span class="contestant-chip d-inline-flex align-items-center gap-2 rounded-pill border border-2 pe-3">
                    <img class="rounded-circle object-fit-cover" alt="" width="52" height="38">
                    <span class="small fw-bold"></span>
                </span>
            </div>`;
        });
        listaRoca.innerHTML = participantesHTML;
        const etiquetas = listaRoca.getElementsByClassName("contestant-chip");
        Array.from(etiquetas).forEach((etiqueta, index) => {
            etiqueta.getElementsByTagName("img")[0].src = participantesRoca[index].foto;
            etiqueta.getElementsByTagName("span")[0].textContent = participantesRoca[index].nome;
        });
    } catch (erro) {
        listaRoca.innerHTML = '<div class="alert alert-danger" role="alert"></div>';
        listaRoca.getElementsByClassName("alert")[0].textContent = `${erro.message} Verifique se o servidor está em execução.`;
    }
}

async function carregarParticipantesVotacao() {
    const listaRoca = document.getElementById("contestants-list");
    const listaDemais = document.getElementById("other-contestants-list");

    try {
        const participantesRoca = await getParticipantesRoca();
        const demaisParticipantes = await getDemaisParticipantes();
        preencherCards(listaRoca, participantesRoca, true);
        preencherCards(listaDemais, demaisParticipantes, false);
    } catch (erro) {
        [listaRoca, listaDemais].forEach((lista) => {
            lista.innerHTML = '<div class="alert alert-danger" role="alert"></div>';
            lista.getElementsByClassName("alert")[0].textContent = `${erro.message} Verifique se o servidor está em execução.`;
        });
    }
}

function criarCardResultado(participante, votos, percentual, saiuHoje) {
    const percentualFormatado = percentual.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });

    return `
        <div class="col-12">
            <article class="card bg-parchment shadow h-100${saiuHoje ? " border border-danger border-2" : " border-0"}">
                <div class="row g-0 align-items-center p-2">
                    <div class="col-4 col-sm-3 col-md-2">
                        <img class="img-fluid rounded object-fit-cover w-100" alt="" height="96">
                    </div>
                    <div class="col-8 col-sm-9 col-md-10">
                        <div class="card-body py-1 pe-1">
                            <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                                <h2 class="h5 card-title text-farm-wood mb-0"></h2>
                                ${saiuHoje ? '<span class="badge text-bg-danger">Sairia hoje</span>' : ""}
                            </div>
                            <div class="progress rounded-pill" role="progressbar"
                                aria-valuenow="${percentual}" aria-valuemin="0" aria-valuemax="100">
                                <div class="progress-bar${saiuHoje ? " bg-danger" : " bg-farm-wood"}" style="width: ${percentual}%"></div>
                            </div>
                            <p class="small text-farm-wood fw-bold mb-0 mt-1">${percentualFormatado}% (${votos} ${votos === 1 ? "voto" : "votos"})</p>
                        </div>
                    </div>
                </div>
            </article>
        </div>`;
}

async function carregarResultado() {
    const lista = document.getElementById("results-list");
    const totalElemento = document.getElementById("total-votes");
    const botaoZerar = document.getElementById("open-reset-modal");
    try {
        const participantes = await getParticipantesRoca();
        const votos = await getVotos();
        const contagem = new Map();
        votos.forEach((voto) => {
            contagem.set(voto.participanteId, (contagem.get(voto.participanteId) || 0) + 1);
        });
        totalElemento.textContent = String(votos.length);
        botaoZerar.hidden = votos.length === 0;
        if (votos.length === 0) {
            lista.innerHTML = `
                <div class="col-12">
                    <div class="bg-parchment rounded-1 p-4 text-center text-farm-wood">
                        <p class="mb-3">Nenhum voto ainda. Escolha quem sai da roça para ver a parcial.</p>
                        <a class="btn btn-farm-red btn-sm fw-bold" href="votacao.html">Ir para a votação</a>
                    </div>
                </div>`;
            return;
        }

        const resultados = [];
        participantes.forEach((participante) => {
            resultados.push({
                participante,
                votos: contagem.get(participante.id) || 0
            });
        });
        const totalVotos = resultados.reduce((total, resultado) => total + resultado.votos, 0);
        let maisVotos = 0;
        resultados.forEach((resultado) => {
            if (resultado.votos > maisVotos) {
                maisVotos = resultado.votos;
            }
        });
        resultados.sort((a, b) => b.votos - a.votos);
        let resultadosHTML = "";
        resultados.forEach(({ participante, votos: quantidade }) => {
            const percentual = quantidade / totalVotos * 100;
            resultadosHTML += criarCardResultado(
                participante,
                quantidade,
                percentual,
                maisVotos > 0 && quantidade === maisVotos
            );
        });
        lista.innerHTML = resultadosHTML || '<p class="col-12 text-light">Não há participantes na roça no momento.</p>';
        const cards = lista.getElementsByClassName("card");
        Array.from(cards).forEach((card, index) => {
            const participante = resultados[index].participante;
            const imagem = card.getElementsByTagName("img")[0];
            imagem.src = participante.foto;
            imagem.alt = `Foto de ${participante.nome}`;
            card.getElementsByClassName("card-title")[0].textContent = participante.nome;
            card.getElementsByClassName("progress")[0].setAttribute("aria-label", `Votos de ${participante.nome}`);
        });
    } catch (erro) {
        lista.innerHTML = '<div class="alert alert-danger" role="alert"></div>';
        lista.getElementsByClassName("alert")[0].textContent = `${erro.message} Verifique se o servidor está em execução.`;
    }
}

async function zerarVotacao() {
    const botao = document.getElementById("confirm-reset-votes");
    const mensagem = document.getElementById("results-message");
    botao.disabled = true;

    try {
        const votos = await getVotos();
        for (const voto of votos) {
            await apagarVoto(voto.id);
        }
        votosRegistradosNestaSessao = 0;
        const modalElement = document.getElementById("resetVotesModal");
        bootstrap.Modal.getOrCreateInstance(modalElement).hide();
        mensagem.innerHTML = '<div class="alert alert-success" role="status">A votação foi zerada.</div>';
        await carregarResultado();
    } catch (erro) {
        mensagem.innerHTML = '<div class="alert alert-danger" role="alert"></div>';
        mensagem.getElementsByClassName("alert")[0].textContent = `${erro.message} Tente novamente.`;
        await carregarResultado();
    } finally {
        botao.disabled = false;
        botao.textContent = "Sim, zerar votação";
    }
}

if (document.getElementById("home-contestants-list")) {
    carregarParticipantesHome();
}

if (document.getElementById("contestants-list")) {
    carregarParticipantesVotacao();
}

if (document.getElementById("results-list")) {
    carregarResultado();
    document.getElementById("confirm-reset-votes").addEventListener("click", zerarVotacao);
}
