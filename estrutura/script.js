document.addEventListener('DOMContentLoaded', function () {
  const socket = io();  // Conexão com o servidor via Socket.io
  let nomeJogador = '';
  let pontuacaoJogador = 0;
  let meuSocketId = ''; // Armazena o ID único do jogador conectado

  // Guarda o ID do socket quando conecta
  socket.on('connect', () => {
    meuSocketId = socket.id;
  });

  // Função para iniciar o jogo
  function iniciarJogo() {
    nomeJogador = document.getElementById('nomeJogador').value;
    if (nomeJogador) {
      socket.emit('iniciar_jogo', nomeJogador);  // Envia o nome para o servidor
      document.getElementById('inicio').style.display = 'none';
      document.getElementById('jogo').style.display = 'block';
      document.getElementById('nomeJogadorDisplay').textContent = nomeJogador;
    } else {
      alert('Por favor, insira seu nome!');
    }
  }

  // Recebe nova bandeira do servidor
  socket.on('bandeira', (bandeira) => {
    document.getElementById('bandeiraImagem').src = bandeira.url;
  });

  // Atualiza lista de jogadores + pontuação local
  function atualizarRanking(jogadores) {
    const listaJogadores = document.getElementById('listaJogadores');
    listaJogadores.innerHTML = '';

    // Ordena por pontuação decrescente (ranking)
    jogadores.sort((a, b) => b.pontuacao - a.pontuacao);

    jogadores.forEach(jogador => {
      const li = document.createElement('li');
      li.textContent = `${jogador.nome}: ${jogador.pontuacao} pontos`;
      listaJogadores.appendChild(li);

      // Agora usamos o ID do socket para identificar o jogador local
      if (jogador.id === meuSocketId) {
        pontuacaoJogador = jogador.pontuacao;
        document.getElementById('pontuacao').textContent = `Pontuação: ${pontuacaoJogador}`;
      }
    });
  }

  // Escuta atualizações dos jogadores (entrada ou saída)
  socket.on('atualizar_jogadores', atualizarRanking);

  // Escuta atualizações de pontuação
  socket.on('atualizar_pontuacao', atualizarRanking);

  // Envia a resposta do jogador
  function enviarResposta() {
    const resposta = document.getElementById('resposta').value;
    if (resposta) {
      socket.emit('resposta', resposta);
      document.getElementById('resposta').value = '';
    } else {
      alert('Por favor, insira sua resposta!');
    }
  }

  // Torna as funções acessíveis pelo botão (HTML)
  window.iniciarJogo = iniciarJogo;
  window.enviarResposta = enviarResposta;
});
