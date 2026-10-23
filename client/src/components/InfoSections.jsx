import { ArrowRight, Palette, ShieldCheck, Star, Upload, WandSparkles, Download, Zap } from 'lucide-react';
import { Brand } from './Header.jsx';

export function WhyUs({ retentionHours }) {
  const items = [
    { icon: Zap, title: 'Rápido e fácil', text: 'Envie a foto, escolha o cenário e receba sua arte em poucos instantes.' },
    { icon: Palette, title: 'Vários cenários', text: 'Metrópole ao pôr do sol, praia neon, bairro anos 90, centro e deserto.' },
    {
      icon: ShieldCheck,
      title: 'Seguro e privado',
      text: `Sua foto só é usada para gerar a arte e é apagada em minutos. A arte gerada some após ${retentionHours}h.`,
    },
    { icon: Star, title: 'Qualidade profissional', text: 'Imagens em alta resolução (até 1536 px), prontas para baixar.' },
  ];
  return (
    <aside className="why" aria-labelledby="why-title">
      <h2 id="why-title">Por que usar?</h2>
      <ul>
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <span className="why__icon"><Icon size={20} /></span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: Upload, title: 'Envie sua foto', text: 'Um retrato nítido, de frente, com boa luz dá os melhores resultados.' },
    { icon: WandSparkles, title: 'A IA transforma', text: 'O modelo redesenha você como personagem ilustrado no cenário escolhido.' },
    { icon: Download, title: 'Baixe e compartilhe', text: 'Veja em tela cheia e baixe o PNG em alta resolução.' },
  ];
  return (
    <section className="section" id="como-funciona">
      <div className="container">
        <h2 className="section__title">Como funciona</h2>
        <ol className="steps">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <span className="steps__num">{i + 1}</span>
              <Icon size={26} className="accent" />
              <strong>{title}</strong>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Faq({ dailyLimit, maxMb }) {
  const qa = [
    ['Quanto tempo demora?', 'Normalmente entre 20 segundos e 1 minuto, dependendo do modelo e da fila da IA.'],
    ['Quantas imagens posso gerar?', `Até ${dailyLimit} por dia. Se a geração falhar, o crédito é devolvido automaticamente.`],
    ['Que tipo de foto funciona melhor?', `Retrato de uma pessoa, rosto visível, sem filtros pesados. JPG, PNG ou WEBP de até ${maxMb} MB.`],
    [
      'Minha foto fica salva?',
      'Não fica salva no site. Para a IA conseguir lê-la, a foto pode ficar por alguns minutos em um armazenamento temporário, que a apaga automaticamente. Só a arte gerada fica disponível por tempo limitado.',
    ],
    ['A arte tem logotipos de jogos?', 'Não. A IA recria o estilo visual, sem logos, títulos ou marcas registradas.'],
  ];
  return (
    <section className="section" id="faq">
      <div className="container container--narrow">
        <h2 className="section__title">Dúvidas frequentes</h2>
        <div className="faq">
          {qa.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer({ onStart }) {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <Brand small />
        <p>Mais do que uma IA, é a sua criatividade sem limites.</p>
        <button type="button" className="btn btn--outline btn--sm" onClick={onStart}>
          <ArrowRight size={16} /> Comece agora
        </button>
      </div>
      <p className="footer__legal">
        Projeto independente. Não é afiliado, patrocinado ou endossado pela Rockstar Games ou Take-Two Interactive.
      </p>
    </footer>
  );
}
