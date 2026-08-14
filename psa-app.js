/* ============================================================================
   psa-app.js — Mapa do Programa Águas para Sempre
   ----------------------------------------------------------------------------
   ARQUIVO ÚNICO. Substitui: css/style.css, js/stats.js, js/chartsQ.js e todos
   os blocos <script> personalizados que ficavam soltos no index.html.

   COMO USAR
   1. Coloque este arquivo na raiz do projeto, ao lado do index.html.
   2. No index.html gerado pelo qgis2web, adicione UMA linha antes de </body>:

          <script src="psa-app.js"></script>

   3. Ao reexportar o mapa do QGIS, sobrescreva tudo e recoloque essa linha.
      Nada mais precisa ser editado no arquivo gerado.

   O QUE MUDOU EM RELAÇÃO AO PROJETO ANTIGO
   - Os grupos de propriedade são lidos de window.overlaysTree pelo RÓTULO,
     não por intervalos de número de camada. Reexportar o QGIS não quebra mais.
   - Os totais são CALCULADOS a partir das feições ativas na legenda.
     Os números manuais viraram overrides opcionais num lugar só (CONFIG.override).
   - A linha do tempo usa as datas reais, contando quantas adesões houve por mês.
   ========================================================================== */

(function () {
  'use strict';

  /* ==========================================================================
     1. CONFIGURAÇÃO — a única parte que você edita no dia a dia
     ========================================================================== */

  var CONFIG = {

    titulo: 'Mapa do Programa Águas para Sempre',

    logo: {
      imagem: 'images/LOGOPSA.png',
      link: 'https://www.aguasdejoinville.com.br/?servico=programa-aguas-para-sempre'
    },

    github: 'https://github.com/brennobenk1/Novosaguasparasempre',

    /* Grupos de propriedade. O "casa" é a expressão que procura o grupo pelo
       rótulo dentro da legenda. Se um grupo não existir no mapa, ele é
       simplesmente omitido do seletor — não dá erro. */
    grupos: [
      { id: 'aderidas',     rotulo: 'Propriedades Aderidas',     casa: /aderid/i,             cor: '#33FF33' },
      { id: 'processo',     rotulo: 'Propriedades em Processo',  casa: /processo/i,           cor: '#FFFF33' },
      { id: 'interessadas', rotulo: 'Propriedades Interessadas', casa: /interessad|manifest/i, cor: '#9999FF' }
    ],

    /* Totais do programa inteiro (editais), usados no gráfico "Comparação Geral".
       Esses não saem das feições do mapa, então continuam manuais. */
    programa: {
      total: 36608.07,
      verde: 30164.30,
      contratada: 159.28
    },

    valorMedioPorHa: 330.00,

    /* Datas de adesão, no formato DD/MM/AAAA. A linha do tempo conta
       quantas adesões houve em cada mês, de verdade. */
    datasAdesao: [
      '25/08/2022', '29/08/2022', '12/05/2023', '24/11/2023', '18/01/2024',
      '28/05/2024', '24/09/2024', '30/09/2024', '31/10/2024', '20/12/2024',
      '07/04/2025', '24/04/2025', '21/07/2025', '25/07/2025', '30/07/2025',
      '19/11/2025', '04/12/2025', '05/12/2025', '06/12/2025', '07/12/2025',
      '08/12/2025', '09/12/2025', '10/12/2025', '11/12/2025', '12/12/2025',
      '13/12/2025', '14/12/2025'
    ],

    pagamentos: [
      { data: '02/10/2023', valor: 571.63 },
      { data: '02/10/2023', valor: 2276.99 },
      { data: '04/10/2023', valor: 1877.31 },
      { data: '13/06/2024', valor: 6531.23 },
      { data: '24/09/2024', valor: 1821.42 },
      { data: '24/09/2024', valor: 790.58 },
      { data: '24/09/2024', valor: 3265.17 },
      { data: '12/12/2024', valor: 1773.35 },
      { data: '06/03/2025', valor: 549.19 },
      { data: '28/05/2025', valor: 5469.12 },
      { data: '04/06/2025', valor: 7815.93 },
      { data: '19/09/2025', valor: 663.19 },
      { data: '19/09/2025', valor: 1915.58 },
      { data: '19/09/2025', valor: 2108.94 },
      { data: '19/09/2025', valor: 1427.82 },
      { data: '19/09/2025', valor: 10361.25 },
      { data: '19/09/2025', valor: 589.88 },
      { data: '04/11/2025', valor: 3748.68 },
      { data: '26/11/2025', valor: 1586.27 }
    ],

    /* OVERRIDE MANUAL — deixe null para o painel calcular sozinho.
       Preencha só se precisar exibir um número que não vem das feições.
       Ex.: { aderidas: { propriedades: 34, area: 2979.51 } }               */
    override: {
      aderidas: null,
      processo: null,
      interessadas: null
    },

    /* Nomes de campo aceitos. A busca ignora acento, maiúscula e espaço,
       então "Área Verd", "AREA_VERD" e "area verde" funcionam igual. */
    campos: {
      area: ['area', 'areatotal'],
      verde: ['areaverd', 'areaverde', 'verde'],
      contratada: ['areacontr', 'areacontratada', 'contratada'],
      identificador: ['id', 'name', 'nome', 'matricula', 'inscricao']
    },

    textoBoasVindas:
      '<p>Este mapa exibe os limites territoriais e as propriedades associadas ao ' +
      'Programa Águas para Sempre na região rural de Joinville e Garuva, para análise ' +
      'e apresentação.</p>' +
      '<p>O botão <strong>Painel</strong> mostra os dados agregados do grupo selecionado. ' +
      'A seleção considera apenas propriedades ativas no mapa: propriedades desmarcadas ' +
      'na legenda não entram nos cálculos. As propriedades do grupo selecionado ficam ' +
      'destacadas em vermelho. Passar o cursor sobre uma feição altera apenas a ' +
      'visualização, não os cálculos.</p>' +
      '<p>O botão <strong>Gráficos</strong> exibe os gráficos disponíveis. ' +
      'O mapa é atualizado conforme necessário para refletir o estado atual do programa.</p>'
  };

  /* ==========================================================================
     2. UTILITÁRIOS
     ========================================================================== */

  function $(id) { return document.getElementById(id); }

  function normalizar(s) {
    return String(s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function paraNumero(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = String(v).trim().replace(/\s/g, '');
    if (s === '') return 0;
    /* Formato brasileiro: ponto é milhar, vírgula é decimal */
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function buscarCampo(props, aceitos) {
    var mapa = {};
    for (var k in props) {
      if (Object.prototype.hasOwnProperty.call(props, k)) mapa[normalizar(k)] = props[k];
    }
    for (var i = 0; i < aceitos.length; i++) {
      var alvo = normalizar(aceitos[i]);
      if (mapa[alvo] !== undefined) return mapa[alvo];
      for (var chave in mapa) {
        if (chave.indexOf(alvo) === 0) return mapa[chave];
      }
    }
    return null;
  }

  var fmt = function (v, casas) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    return Number(v).toLocaleString('pt-BR', {
      minimumFractionDigits: casas === undefined ? 2 : casas,
      maximumFractionDigits: casas === undefined ? 2 : casas
    });
  };

  var fmtMoeda = function (v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  function mapa() { return window.map || window._map || null; }

  /* ==========================================================================
     3. LEITURA DOS GRUPOS A PARTIR DA LEGENDA
     ========================================================================== */

  /* Percorre window.overlaysTree e devolve, para cada grupo configurado,
     a lista de camadas Leaflet que pertencem a ele. */
  function lerGrupos() {
    var arvore = window.overlaysTree;
    var achados = {};
    if (!arvore) return achados;

    function coletarFolhas(no, saco) {
      if (!no) return;
      if (Array.isArray(no)) { no.forEach(function (n) { coletarFolhas(n, saco); }); return; }
      if (no.layer) saco.push(no.layer);
      if (no.children) coletarFolhas(no.children, saco);
    }

    function percorrer(nos) {
      if (!Array.isArray(nos)) return;
      nos.forEach(function (no) {
        if (!no) return;
        var rotulo = String(no.label || '').replace(/<[^>]*>/g, '').trim();
        CONFIG.grupos.forEach(function (g) {
          if (achados[g.id]) return;
          if (no.children && g.casa.test(rotulo)) {
            var saco = [];
            coletarFolhas(no.children, saco);
            if (saco.length) achados[g.id] = { rotulo: rotulo, camadas: saco };
          }
        });
        if (no.children) percorrer(no.children);
      });
    }

    percorrer(arvore);
    return achados;
  }

  var GRUPOS = {};

  /* Feições visíveis de um grupo: só camadas marcadas na legenda. */
  function feicoesAtivas(idGrupo) {
    var m = mapa();
    var grupo = GRUPOS[idGrupo];
    var saida = [];
    if (!m || !grupo) return saida;

    grupo.camadas.forEach(function (camada) {
      if (!camada || !m.hasLayer(camada)) return;
      if (typeof camada.eachLayer === 'function') {
        camada.eachLayer(function (f) {
          if (f && f.feature && f.feature.properties) saida.push(f);
        });
      } else if (camada.feature) {
        saida.push(camada);
      }
    });
    return saida;
  }

  /* ==========================================================================
     4. CÁLCULO DAS ESTATÍSTICAS
     ========================================================================== */

  function calcular(idGrupo) {
    var feicoes = feicoesAtivas(idGrupo);
    var vistos = {};
    var itens = [];

    feicoes.forEach(function (f) {
      var p = f.feature.properties;
      var id = buscarCampo(p, CONFIG.campos.identificador);
      var chave = id !== null ? String(id) : ('anon_' + itens.length);
      if (vistos[chave]) return;
      vistos[chave] = true;

      itens.push({
        chave: chave,
        camada: f,
        area: paraNumero(buscarCampo(p, CONFIG.campos.area)),
        verde: paraNumero(buscarCampo(p, CONFIG.campos.verde)),
        contratada: paraNumero(buscarCampo(p, CONFIG.campos.contratada))
      });
    });

    var r = {
      propriedades: itens.length,
      area: 0, verde: 0, contratada: 0,
      nArea: 0, nVerde: 0, nContratada: 0,
      itens: itens
    };

    itens.forEach(function (it) {
      if (it.area > 0) { r.area += it.area; r.nArea++; }
      if (it.verde > 0) { r.verde += it.verde; r.nVerde++; }
      if (it.contratada > 0) { r.contratada += it.contratada; r.nContratada++; }
    });

    r.mediaArea = r.nArea ? r.area / r.nArea : null;
    r.mediaVerde = r.nVerde ? r.verde / r.nVerde : null;

    /* Override manual, se preenchido */
    var ov = CONFIG.override[idGrupo];
    if (ov) {
      if (ov.propriedades != null) r.propriedades = ov.propriedades;
      if (ov.area != null) r.area = ov.area;
      if (ov.verde != null) r.verde = ov.verde;
      if (ov.contratada != null) r.contratada = ov.contratada;
      if (ov.propriedades) {
        r.mediaArea = r.area / ov.propriedades;
        r.mediaVerde = r.verde / ov.propriedades;
      }
      r.manual = true;
    }

    return r;
  }

  /* ==========================================================================
     5. DESTAQUE DAS FEIÇÕES SELECIONADAS
     ========================================================================== */

  var destacadas = [];
  var mostrarSelecao = true;

  function limparDestaque() {
    destacadas.forEach(function (f) {
      try { if (f.setStyle && f._estiloOriginal) f.setStyle(f._estiloOriginal); } catch (e) {}
    });
    destacadas = [];
  }

  function aplicarDestaque(itens) {
    limparDestaque();
    if (!mostrarSelecao) return;
    itens.forEach(function (it) {
      var f = it.camada;
      if (!f || !f.setStyle) return;
      if (!f._estiloOriginal) {
        f._estiloOriginal = {
          color: f.options.color, weight: f.options.weight,
          fillColor: f.options.fillColor, fillOpacity: f.options.fillOpacity,
          opacity: f.options.opacity, dashArray: f.options.dashArray
        };
      }
      try {
        f.setStyle({ color: '#e53030', weight: 3, fillColor: '#e53030', fillOpacity: 0.3 });
        destacadas.push(f);
      } catch (e) {}
    });
  }

  /* ==========================================================================
     6. CSS
     ========================================================================== */

  var CSS = [
    "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');",

    ':root{--psa-painel:rgba(252,247,238,.985);--psa-raio:24px;--psa-txt:#0f1f12;--psa-txt2:#28422f;',
    '--psa-txt3:#526b5b;--psa-verde:#1a7c42;--psa-linha:rgba(26,124,66,.18);',
    '--psa-sombra:0 28px 64px -14px rgba(6,28,14,.4),0 6px 20px rgba(0,0,0,.09),inset 0 2px 0 rgba(255,255,255,.95);',
    '--psa-mola:.42s cubic-bezier(.34,1.56,.64,1);--psa-suave:.28s cubic-bezier(.25,.46,.45,.94)}',

    'html,body{height:100%;margin:0;padding:0;font-family:"DM Sans",sans-serif}',
    '#map{height:100vh;width:100%;position:relative;z-index:0}',
    '.info.leaflet-control{display:none!important}',
    '.leaflet-control-measure-toggle{display:none!important}',
    '.psa-oculto{display:none!important}',

    '@keyframes psaSobe{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}',
    '@keyframes psaFade{from{opacity:0}to{opacity:1}}',

    /* Cabeçalho */
    '#psa-header{position:absolute;top:18px;left:50%;transform:translateX(-50%);background:var(--psa-painel);',
    'padding:13px 34px;font-family:"Playfair Display",Georgia,serif;font-size:18px;font-weight:600;',
    'color:var(--psa-txt);border-radius:60px;border:1px solid rgba(80,150,100,.22);white-space:nowrap;',
    'z-index:1000;box-shadow:0 12px 34px rgba(10,40,20,.18);animation:psaSobe .7s var(--psa-mola) both}',

    /* Botões laterais */
    '#psa-botoes{display:flex;flex-direction:column;gap:10px;position:absolute;top:96px;left:18px;z-index:1000}',
    '#psa-botoes button{display:flex;align-items:center;gap:10px;padding:0 20px;height:48px;width:170px;',
    'border:none;border-radius:18px;font-family:"DM Sans",sans-serif;font-size:.94rem;font-weight:600;',
    'cursor:pointer;background:#66FFFF;color:#0a2a1a;box-shadow:0 8px 22px rgba(0,190,190,.38);',
    'transition:transform var(--psa-mola),box-shadow var(--psa-suave)}',
    '#psa-botoes button:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,190,190,.5)}',
    '#psa-botoes button:active{transform:translateY(2px) scale(.98)}',
    '#psa-botoes svg{width:20px;height:20px;flex-shrink:0}',

    /* Painéis */
    '.psa-painel{position:absolute;top:96px;left:18px;width:540px;max-width:calc(100vw - 36px);max-height:80vh;',
    'padding:32px 30px 28px;background:var(--psa-painel);color:var(--psa-txt);border-radius:var(--psa-raio);',
    'border:1px solid rgba(60,110,75,.14);box-shadow:var(--psa-sombra);overflow-y:auto;z-index:3000;',
    'font-family:"DM Sans",sans-serif;animation:psaSobe .45s cubic-bezier(.16,1,.3,1) both}',
    '.psa-painel::before{content:"";position:absolute;top:0;left:0;right:0;height:5px;',
    'background:linear-gradient(145deg,#1f9450,#126134);border-radius:var(--psa-raio) var(--psa-raio) 0 0}',
    '.psa-painel h2{font-family:"Playfair Display",Georgia,serif;font-size:21px;font-weight:700;margin:0 0 18px;',
    'padding-bottom:14px;border-bottom:1px solid var(--psa-linha);position:relative}',
    '.psa-painel h2::after{content:"";position:absolute;bottom:-1px;left:0;width:46px;height:3px;',
    'background:linear-gradient(145deg,#1f9450,#126134);border-radius:3px}',
    '.psa-painel::-webkit-scrollbar{width:6px}',
    '.psa-painel::-webkit-scrollbar-thumb{background:rgba(26,124,66,.4);border-radius:10px}',

    '.psa-fechar{position:absolute;top:14px;right:14px;width:34px;height:34px;border:1px solid rgba(60,110,75,.2);',
    'background:rgba(252,247,238,.9);cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'border-radius:11px;padding:0;transition:transform var(--psa-mola),background var(--psa-suave);z-index:10}',
    '.psa-fechar:hover{background:rgba(220,80,60,.12);transform:scale(1.1) rotate(6deg)}',
    '.psa-fechar svg{width:14px;height:14px}',

    /* Seletores */
    '.psa-select{appearance:none;-webkit-appearance:none;width:100%;padding:12px 44px 12px 16px;font-size:14px;',
    'font-family:"DM Sans",sans-serif;font-weight:600;color:var(--psa-txt);background:rgba(26,124,66,.05);',
    'border:1.5px solid rgba(26,124,66,.22);border-radius:13px;cursor:pointer;box-sizing:border-box}',
    '.psa-select:focus{outline:none;border-color:var(--psa-verde);box-shadow:0 0 0 4px rgba(26,124,66,.14)}',
    '.psa-select-wrap{position:relative;width:100%;margin-bottom:18px}',
    '.psa-select-wrap::after{content:"▾";position:absolute;right:15px;top:50%;transform:translateY(-50%);',
    'color:var(--psa-verde);font-weight:700;font-size:17px;pointer-events:none}',

    /* Lista de estatísticas */
    '.psa-lista{display:flex;flex-direction:column;gap:6px}',
    '.psa-item{display:flex;align-items:center;gap:10px;padding:12px 15px;background:rgba(26,124,66,.04);',
    'border-radius:12px;border-left:4px solid var(--psa-verde);font-size:13.5px;',
    'transition:background var(--psa-suave),transform var(--psa-mola)}',
    '.psa-item:hover{background:rgba(26,124,66,.09);transform:translateX(4px)}',
    '.psa-rot{color:var(--psa-txt2);flex:1;font-weight:500}',
    '.psa-val{font-weight:700;color:var(--psa-txt);text-align:right;white-space:nowrap;',
    'font-variant-numeric:tabular-nums;font-size:14.5px}',
    '.psa-uni{color:var(--psa-txt3);font-size:11.5px;font-weight:500}',
    '.psa-sep{height:1px;background:linear-gradient(90deg,transparent,var(--psa-linha),transparent);margin:7px 0}',
    '.psa-aviso{font-size:12px;color:var(--psa-txt3);padding:8px 4px 0;line-height:1.5}',

    /* Toggle de seleção */
    '.psa-toggle{display:inline-flex;align-items:center;gap:7px;cursor:pointer;user-select:none;',
    'margin-left:10px;vertical-align:middle;font-size:12.5px;font-weight:600;color:var(--psa-txt3)}',
    '.psa-toggle input{position:absolute;opacity:0;width:0;height:0}',
    '.psa-trilho{position:relative;width:34px;height:19px;background:rgba(150,150,150,.25);border-radius:20px;',
    'border:1.5px solid rgba(150,150,150,.3);transition:background .2s,border-color .2s;flex-shrink:0}',
    '.psa-bola{position:absolute;top:2px;left:2px;width:12px;height:12px;background:#aaa;border-radius:50%;',
    'transition:transform .2s cubic-bezier(.34,1.56,.64,1),background .2s}',
    '.psa-toggle input:checked~.psa-trilho{background:rgba(220,50,40,.18);border-color:rgba(220,50,40,.5)}',
    '.psa-toggle input:checked~.psa-trilho .psa-bola{transform:translateX(15px);background:#dc3228}',

    /* Popup de boas-vindas */
    '#psa-popup{position:fixed;inset:0;background:rgba(4,18,9,.7);display:flex;justify-content:center;',
    'align-items:center;z-index:9999;animation:psaFade .35s ease both;cursor:pointer}',
    '#psa-popup-caixa{position:relative;background:var(--psa-painel);width:600px;max-width:94%;max-height:88vh;',
    'border-radius:28px;overflow:hidden;display:flex;flex-direction:column;cursor:default;',
    'box-shadow:0 36px 80px rgba(4,18,9,.48);animation:psaSobe .55s var(--psa-mola) both}',
    '#psa-popup-topo{height:96px;flex-shrink:0;background:linear-gradient(145deg,#1a8545,#0f5e30 60%,#093d1e)}',
    '#psa-popup-corpo{padding:26px 34px 32px;overflow-y:auto}',
    '#psa-popup-corpo h2{font-family:"Playfair Display",Georgia,serif;font-size:22px;font-weight:700;',
    'margin:0 0 18px;padding-bottom:14px;border-bottom:1px solid var(--psa-linha)}',
    '#psa-popup-corpo p{margin:0 0 14px;color:var(--psa-txt2);font-size:14.5px;line-height:1.7}',
    '#psa-popup .psa-fechar{background:rgba(255,255,255,.25);border-color:rgba(255,255,255,.4);border-radius:50%;',
    'width:38px;height:38px}',
    '#psa-popup .psa-fechar svg{stroke:#fff}',

    /* Gráficos */
    '#psa-canvas-wrap{position:relative;margin-top:16px;min-height:300px}',

    /* Rodapé: logo, github, bússola, escala, coordenadas */
    '#psa-logo{position:fixed;left:18px;bottom:20px;z-index:2000}',
    '#psa-logo img{width:130px;height:auto;display:block;filter:drop-shadow(0 5px 16px rgba(10,40,20,.22));',
    'transition:transform var(--psa-mola)}',
    '#psa-logo:hover img{transform:translateY(-4px)}',
    '.psa-pilula{background:var(--psa-painel);border:1px solid rgba(60,110,75,.18);border-radius:13px;',
    'box-shadow:0 8px 22px rgba(10,40,20,.13);font-family:"DM Sans",sans-serif;font-size:12.5px;',
    'font-weight:600;color:var(--psa-txt2)}',
    '#psa-github{position:fixed;left:172px;bottom:20px;z-index:2000;padding:9px;border-radius:14px;',
    'display:flex;transition:transform var(--psa-mola)}',
    '#psa-github:hover{transform:translateY(-4px)}',
    '#psa-github svg{width:26px;height:26px;display:block}',
    '#psa-bussola{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2000;width:54px;',
    'height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center}',
    '#psa-bussola svg{width:34px;height:34px}',
    '#psa-escala{position:fixed;bottom:20px;left:calc(50% - 210px);padding:9px 15px;z-index:1000}',
    '#psa-escala-barra{height:8px;min-width:100px;margin-bottom:4px;border:1.5px solid rgba(26,124,66,.45);',
    'border-radius:4px}',
    '#psa-escala-texto{text-align:center;color:var(--psa-txt3);font-size:11.5px}',
    '#psa-coords{position:fixed;bottom:20px;left:calc(50% + 56px);padding:9px 15px;z-index:1000;',
    'pointer-events:none;line-height:1.5}',

    /* Legenda do Leaflet */
    '.leaflet-control-layers{background:var(--psa-painel)!important;border-radius:18px!important;',
    'padding:12px!important;border:1px solid rgba(60,110,75,.14)!important;',
    'box-shadow:0 16px 40px rgba(10,40,20,.2)!important;font-family:"DM Sans",sans-serif!important}',
    '.leaflet-control-layers-list{max-height:64vh;overflow-y:auto;min-width:230px;padding-right:6px;',
    'border:1.5px solid rgba(26,124,66,.2);border-radius:12px}',
    '.leaflet-layerstree-header-pointer{background:#66FFFF!important;color:#0a2a1a!important;padding:9px 13px;',
    'border-radius:11px!important;margin-bottom:8px;font-weight:700!important;font-size:13px;cursor:pointer}',
    '.leaflet-layerstree-header-label{display:flex;align-items:center;padding:5px 7px;margin:2px 0;',
    'border-radius:8px;font-size:13px;color:var(--psa-txt2)}',
    '.leaflet-layerstree-header-label:hover{background:rgba(26,124,66,.08)}',
    '.leaflet-layerstree-header-name img{width:20px;height:20px;margin-right:8px;object-fit:contain}',

    /* Responsivo */
    '@media (max-width:760px){',
    '#psa-header{font-size:15px;padding:10px 20px;max-width:88vw;overflow:hidden;text-overflow:ellipsis}',
    '#psa-botoes{top:74px;left:10px;gap:8px}',
    '#psa-botoes button{width:52px;height:44px;padding:0;justify-content:center}',
    '#psa-botoes .psa-rotulo{display:none}',
    '.psa-painel{left:10px;right:10px;width:auto;top:74px;max-height:72vh;padding:26px 20px 22px}',
    '#psa-escala,#psa-coords,#psa-github{display:none}',
    '#psa-logo img{width:96px}',
    '#psa-bussola{width:44px;height:44px}}'
  ].join('');

  /* ==========================================================================
     7. ÍCONES (SVG embutido — nenhum arquivo de imagem necessário)
     ========================================================================== */

  var ICO = {
    painel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></svg>',
    grafico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 4 6-8"/><path d="M3 21h18"/></svg>',
    detalhes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5v.5"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" fill="none" stroke="#28422f" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    bussola: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" fill="rgba(252,247,238,.99)" stroke="rgba(60,110,75,.25)" stroke-width="1.5"/><path d="M24 7l4.5 15L24 19.5 19.5 22z" fill="#dc3228"/><path d="M24 41l-4.5-15L24 28.5l4.5-2.5z" fill="#28422f"/><text x="24" y="6.5" text-anchor="middle" font-size="6" font-family="DM Sans,sans-serif" font-weight="700" fill="#28422f">N</text></svg>',
    github: '<svg viewBox="0 0 24 24" fill="#0f1f12"><path d="M12 .5C5.7.5.6 5.6.6 11.9c0 5 3.3 9.3 7.8 10.8.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6a11.4 11.4 0 0 0 7.8-10.8C23.4 5.6 18.3.5 12 .5z"/></svg>'
  };

  /* ==========================================================================
     8. MONTAGEM DA INTERFACE
     ========================================================================== */

  function montarInterface() {
    var estilo = document.createElement('style');
    estilo.id = 'psa-estilo';
    estilo.textContent = CSS;
    document.head.appendChild(estilo);

    var frag = document.createElement('div');
    frag.innerHTML = [
      '<div id="psa-header">' + CONFIG.titulo + '</div>',

      '<div id="psa-botoes">',
      '<button id="psa-btn-painel" type="button">' + ICO.painel + '<span class="psa-rotulo">Painel</span></button>',
      '<button id="psa-btn-grafico" type="button">' + ICO.grafico + '<span class="psa-rotulo">Gráficos</span></button>',
      '<button id="psa-btn-detalhes" type="button">' + ICO.detalhes + '<span class="psa-rotulo">Detalhes</span></button>',
      '</div>',

      '<div id="psa-escala" class="psa-pilula"><div id="psa-escala-barra"></div>',
      '<div id="psa-escala-texto">0 m</div></div>',
      '<div id="psa-coords" class="psa-pilula">—</div>',
      '<div id="psa-bussola" class="psa-pilula">' + ICO.bussola + '</div>',

      '<a id="psa-logo" href="' + CONFIG.logo.link + '" target="_blank" rel="noopener">',
      '<img src="' + CONFIG.logo.imagem + '" alt="Águas de Joinville" onerror="this.style.display=\'none\'">',
      '</a>',
      '<a id="psa-github" class="psa-pilula" href="' + CONFIG.github + '" target="_blank" rel="noopener"',
      ' aria-label="Repositório no GitHub">' + ICO.github + '</a>',

      /* Painel de acompanhamento */
      '<div id="psa-painel-stats" class="psa-painel psa-oculto" role="region" aria-label="Painel de acompanhamento">',
      '<button class="psa-fechar" id="psa-fechar-stats" aria-label="Fechar painel">' + ICO.fechar + '</button>',
      '<h2>Painel de Acompanhamento',
      '<label class="psa-toggle" title="Mostrar ou ocultar o destaque vermelho">',
      '<input type="checkbox" id="psa-chk-selecao" checked>',
      '<span class="psa-trilho"><span class="psa-bola"></span></span><span>Seleção visível</span></label>',
      '</h2>',
      '<div class="psa-select-wrap"><select id="psa-grupo" class="psa-select"></select></div>',
      '<div class="psa-lista" id="psa-stats-lista"></div>',
      '<div class="psa-aviso" id="psa-stats-aviso"></div>',
      '</div>',

      /* Painel de gráficos */
      '<div id="psa-painel-chart" class="psa-painel psa-oculto" role="dialog" aria-label="Painel de gráficos">',
      '<button class="psa-fechar" id="psa-fechar-chart" aria-label="Fechar painel">' + ICO.fechar + '</button>',
      '<h2>Painel de Gráficos</h2>',
      '<div class="psa-select-wrap"><select id="psa-gtipo" class="psa-select">',
      '<option value="geral">Comparação Geral do Programa</option>',
      '<option value="credenciado">Comparação Contratado/Credenciado</option>',
      '<option value="linha">Linha do Tempo das Adesões</option>',
      '<option value="pagamentos">Pagamentos</option>',
      '</select></div>',
      '<div id="psa-canvas-wrap"><canvas id="psa-canvas"></canvas></div>',
      '</div>',

      /* Popup de boas-vindas */
      '<div id="psa-popup" class="psa-oculto">',
      '<div id="psa-popup-caixa">',
      '<div id="psa-popup-topo"></div>',
      '<button class="psa-fechar" id="psa-fechar-popup" aria-label="Fechar">' + ICO.fechar + '</button>',
      '<div id="psa-popup-corpo"><h2>Bem-vindo(a) ao Mapa do Programa Águas Para Sempre</h2>',
      CONFIG.textoBoasVindas + '</div></div></div>'
    ].join('');

    while (frag.firstChild) document.body.appendChild(frag.firstChild);
  }

  /* ==========================================================================
     9. PAINEL DE ACOMPANHAMENTO
     ========================================================================== */

  function montarSeletorGrupos() {
    var sel = $('psa-grupo');
    sel.innerHTML = '';
    CONFIG.grupos.forEach(function (g) {
      if (!GRUPOS[g.id]) return;
      var o = document.createElement('option');
      o.value = g.id;
      o.textContent = g.rotulo;
      sel.appendChild(o);
    });
    if (!sel.options.length) {
      var vazio = document.createElement('option');
      vazio.textContent = 'Nenhum grupo de propriedades encontrado';
      sel.appendChild(vazio);
    }
  }

  function linha(rotulo, valor, unidade) {
    return '<div class="psa-item"><span class="psa-rot"><strong>' + rotulo + '</strong></span>' +
      '<span class="psa-val">' + valor + '</span>' +
      (unidade ? '<span class="psa-uni">' + unidade + '</span>' : '') + '</div>';
  }

  function atualizarPainel() {
    var sel = $('psa-grupo');
    if (!sel || !sel.value) return;
    var r = calcular(sel.value);

    $('psa-stats-lista').innerHTML = [
      linha('Propriedades:', String(r.propriedades), ''),
      linha('Área total das propriedades:', fmt(r.area), 'ha'),
      linha('Área verde total das propriedades:', fmt(r.verde), 'ha'),
      '<div class="psa-sep"></div>',
      linha('Média da área total:', fmt(r.mediaArea), 'ha'),
      linha('Média da área verde:', fmt(r.mediaVerde), 'ha'),
      '<div class="psa-sep"></div>',
      linha('Área contratada:', fmt(r.contratada), 'ha'),
      linha('Valor médio/ha:', fmtMoeda(CONFIG.valorMedioPorHa), '/ha')
    ].join('');

    var avisos = [];
    if (r.manual) avisos.push('Valores exibidos vêm de CONFIG.override, não do cálculo automático.');
    if (!r.manual && r.propriedades && !r.nArea) {
      avisos.push('Nenhum campo de área encontrado nas feições. Verifique CONFIG.campos.');
    }
    if (!r.propriedades) avisos.push('Nenhuma propriedade ativa neste grupo — verifique as marcações na legenda.');
    $('psa-stats-aviso').textContent = avisos.join(' ');

    aplicarDestaque(r.itens);
  }

  /* ==========================================================================
     10. GRÁFICOS
     ========================================================================== */

  var instanciaChart = null;

  function carregarChartJs(pronto) {
    if (typeof window.Chart !== 'undefined') { pronto(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = pronto;
    s.onerror = function () { console.warn('psa-app: não foi possível carregar o Chart.js'); };
    document.head.appendChild(s);
  }

  function eixoHa(titulo) {
    return {
      y: {
        beginAtZero: true,
        title: { display: true, text: titulo || 'hectares (ha)' },
        ticks: { callback: function (v) { return Number(v).toLocaleString('pt-BR'); } }
      }
    };
  }

  function tooltipHa(base) {
    return {
      callbacks: {
        label: function (c) {
          var v = Number(c.parsed.y != null ? c.parsed.y : c.raw) || 0;
          var pct = base ? ' (' + ((v / base) * 100).toFixed(1) + '%)' : '';
          return c.dataset.label + ': ' + fmt(v) + ' ha' + pct;
        }
      }
    };
  }

  /* Conta adesões acumuladas por mês, a partir das datas reais */
  function acumuladoPorMes(datas) {
    var porMes = {};
    datas.forEach(function (d) {
      var p = String(d).split('/');
      if (p.length !== 3) return;
      var chave = p[2] + '-' + ('0' + p[1]).slice(-2);
      porMes[chave] = (porMes[chave] || 0) + 1;
    });
    var chaves = Object.keys(porMes).sort();
    var rotulos = [], valores = [], soma = 0;
    chaves.forEach(function (k) {
      soma += porMes[k];
      var p = k.split('-');
      rotulos.push(p[1] + '/' + p[0]);
      valores.push(soma);
    });
    return { rotulos: rotulos, valores: valores, total: soma };
  }

  function somaPagamentosPorAno(lista) {
    var porAno = {};
    lista.forEach(function (p) {
      var partes = String(p.data).split('/');
      if (partes.length !== 3) return;
      var ano = partes[2];
      porAno[ano] = (porAno[ano] || 0) + (Number(p.valor) || 0);
    });
    var anos = Object.keys(porAno).sort();
    return {
      rotulos: anos,
      valores: anos.map(function (a) { return Number(porAno[a].toFixed(2)); })
    };
  }

  function desenharGrafico() {
    var canvas = $('psa-canvas');
    if (!canvas || typeof window.Chart === 'undefined') return;
    if (instanciaChart) { instanciaChart.destroy(); instanciaChart = null; }

    var ctx = canvas.getContext('2d');
    var tipo = $('psa-gtipo').value;

    if (tipo === 'geral') {
      var pr = CONFIG.programa;
      instanciaChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Programa completo (editais + propriedades)'],
          datasets: [
            { label: 'Área total do programa', data: [pr.total], backgroundColor: 'rgba(15,92,143,.65)' },
            { label: 'Área verde total estimada', data: [pr.verde], backgroundColor: 'rgba(104,218,82,.65)' },
            { label: 'Área total contratada', data: [pr.contratada], backgroundColor: 'rgba(252,186,121,.75)' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' }, tooltip: tooltipHa(pr.total) },
          scales: eixoHa()
        }
      });

    } else if (tipo === 'credenciado') {
      var idAderidas = GRUPOS.aderidas ? 'aderidas' : ($('psa-grupo').value || 'aderidas');
      var r = calcular(idAderidas);
      instanciaChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Propriedades credenciadas (' + r.propriedades + ')'],
          datasets: [
            { label: 'Área total', data: [r.area], backgroundColor: 'rgba(54,162,235,.65)' },
            { label: 'Área verde total', data: [r.verde], backgroundColor: 'rgba(75,192,192,.65)' },
            { label: 'Área contratada', data: [r.contratada], backgroundColor: 'rgba(255,159,64,.75)' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' }, tooltip: tooltipHa(r.area) },
          scales: eixoHa()
        }
      });

    } else if (tipo === 'linha') {
      var ac = acumuladoPorMes(CONFIG.datasAdesao);
      instanciaChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ac.rotulos,
          datasets: [{
            label: 'Adesões acumuladas (' + ac.total + ' no total)',
            data: ac.valores,
            borderColor: 'rgb(15,92,143)',
            backgroundColor: 'rgba(15,92,143,.2)',
            tension: .25, fill: true, pointRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'propriedades' } } }
        }
      });

    } else if (tipo === 'pagamentos') {
      var pg = somaPagamentosPorAno(CONFIG.pagamentos);
      instanciaChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: pg.rotulos,
          datasets: [{
            label: 'Pagamentos por ano',
            data: pg.valores,
            borderColor: 'rgb(15,92,143)',
            backgroundColor: 'rgba(15,92,143,.15)',
            tension: .25, fill: true, pointRadius: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: { callbacks: { label: function (c) { return fmtMoeda(c.parsed.y); } } }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'R$' },
                 ticks: { callback: function (v) { return fmtMoeda(v); } } },
            x: { type: 'category', title: { display: true, text: 'Ano' } }
          }
        }
      });
    }
  }

  /* ==========================================================================
     11. ESCALA, COORDENADAS E CORES DA LEGENDA
     ========================================================================== */

  function atualizarEscala() {
    var m = mapa();
    var barra = $('psa-escala-barra'), texto = $('psa-escala-texto');
    if (!m || !barra || !texto) return;
    try {
      var y = m.getSize().y / 2;
      var a = m.containerPointToLatLng([0, y]);
      var b = m.containerPointToLatLng([100, y]);
      var dist = a.distanceTo(b);
      var valor, unidade;
      if (dist >= 1000) { valor = Math.round(dist / 1000); unidade = 'km'; }
      else { valor = Math.round(dist); unidade = 'm'; }
      var largura = Math.round((valor * (unidade === 'km' ? 1000 : 1) / dist) * 100);
      barra.style.width = Math.max(40, Math.min(180, largura)) + 'px';
      barra.style.background = 'repeating-linear-gradient(90deg,#1a7c42 0,#1a7c42 25%,' +
        'rgba(252,247,238,.95) 25%,rgba(252,247,238,.95) 50%)';
      texto.textContent = valor.toLocaleString('pt-BR') + ' ' + unidade;
    } catch (e) {}
  }

  function ligarCoordenadas() {
    var m = mapa(), el = $('psa-coords');
    if (!m || !el) return;
    m.on('mousemove', function (e) {
      el.innerHTML = 'Lat ' + e.latlng.lat.toFixed(5) + '<br>Lng ' + e.latlng.lng.toFixed(5);
    });
  }

  function colorirLegenda() {
    var alvos = document.querySelectorAll('.leaflet-layerstree-header-pointer');
    Array.prototype.forEach.call(alvos, function (el) {
      var txt = el.textContent.trim();
      var achou = null;
      CONFIG.grupos.forEach(function (g) { if (!achou && g.casa.test(txt)) achou = g; });
      if (achou) {
        el.style.setProperty('background', achou.cor, 'important');
        el.style.setProperty('color', '#0a2410', 'important');
      }
    });
  }

  /* ==========================================================================
     12. INICIALIZAÇÃO
     ========================================================================== */

  function abrir(el) {
    document.querySelectorAll('.psa-painel').forEach(function (p) {
      if (p !== el) p.classList.add('psa-oculto');
    });
    el.classList.remove('psa-oculto');
  }

  function ligarEventos() {
    $('psa-btn-painel').addEventListener('click', function () {
      var p = $('psa-painel-stats');
      if (p.classList.contains('psa-oculto')) { abrir(p); atualizarPainel(); }
      else { p.classList.add('psa-oculto'); limparDestaque(); }
    });

    $('psa-fechar-stats').addEventListener('click', function () {
      $('psa-painel-stats').classList.add('psa-oculto');
      limparDestaque();
    });

    $('psa-btn-grafico').addEventListener('click', function () {
      var p = $('psa-painel-chart');
      if (p.classList.contains('psa-oculto')) {
        abrir(p);
        carregarChartJs(function () { setTimeout(desenharGrafico, 60); });
      } else { p.classList.add('psa-oculto'); }
    });

    $('psa-fechar-chart').addEventListener('click', function () {
      $('psa-painel-chart').classList.add('psa-oculto');
    });

    $('psa-gtipo').addEventListener('change', desenharGrafico);
    $('psa-grupo').addEventListener('change', atualizarPainel);

    $('psa-chk-selecao').addEventListener('change', function () {
      mostrarSelecao = this.checked;
      if (!mostrarSelecao) limparDestaque();
      else atualizarPainel();
    });

    $('psa-btn-detalhes').addEventListener('click', function () {
      $('psa-popup').classList.remove('psa-oculto');
    });
    $('psa-fechar-popup').addEventListener('click', function () {
      $('psa-popup').classList.add('psa-oculto');
    });
    $('psa-popup').addEventListener('click', function (e) {
      if (e.target === this) this.classList.add('psa-oculto');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      $('psa-popup').classList.add('psa-oculto');
      $('psa-painel-chart').classList.add('psa-oculto');
      if (!$('psa-painel-stats').classList.contains('psa-oculto')) {
        $('psa-painel-stats').classList.add('psa-oculto');
        limparDestaque();
      }
    });

    var m = mapa();
    if (m) {
      m.on('zoomend moveend', atualizarEscala);
      m.on('overlayadd overlayremove layeradd layerremove', function () {
        if (!$('psa-painel-stats').classList.contains('psa-oculto')) {
          clearTimeout(window._psaTimer);
          window._psaTimer = setTimeout(atualizarPainel, 120);
        }
      });
    }
  }

  function iniciar() {
    if (!mapa()) { setTimeout(iniciar, 150); return; }

    montarInterface();
    GRUPOS = lerGrupos();
    montarSeletorGrupos();
    ligarEventos();
    ligarCoordenadas();
    atualizarEscala();
    setTimeout(atualizarEscala, 600);

    colorirLegenda();
    new MutationObserver(colorirLegenda).observe(document.body, { childList: true, subtree: true });

    $('psa-popup').classList.remove('psa-oculto');

    var nomes = Object.keys(GRUPOS);
    if (!nomes.length) {
      console.warn('psa-app: nenhum grupo encontrado em window.overlaysTree. ' +
        'Confira os rótulos dos grupos na legenda e ajuste CONFIG.grupos[].casa');
    } else {
      console.log('psa-app: grupos encontrados —', nomes.map(function (n) {
        return GRUPOS[n].rotulo + ' (' + GRUPOS[n].camadas.length + ' camadas)';
      }).join(' | '));
    }

    window.psaApp = {
      config: CONFIG,
      grupos: function () { return GRUPOS; },
      calcular: calcular,
      atualizar: atualizarPainel
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
