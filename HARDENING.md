### Vulnerabilidades residuais

Após a atualização da imagem base para `node:22-trixie-slim`, foi realizada uma nova análise com o Trivy. O relatório passou a indicar zero vulnerabilidades críticas, embora ainda existam vulnerabilidades classificadas como altas em pacotes do sistema operacional e componentes relacionados ao ambiente Node.js.

A auditoria das dependências de produção da aplicação não identificou vulnerabilidades. As ocorrências restantes não foram totalmente eliminadas no escopo desta atividade e devem ser acompanhadas em futuras atualizações da imagem base e de seus componentes.

A ausência de vulnerabilidades críticas no relatório não significa que a imagem esteja completamente livre de riscos.
