# Hardening de Containers — Relatório da Atividade

## 1. Objetivo

O objetivo desta atividade foi analisar e melhorar a segurança de uma aplicação web executada em containers Docker, reduzindo sua superfície de ataque e aplicando o princípio do menor privilégio sem comprometer seu funcionamento.

As medidas implementadas envolveram a imagem Docker, os privilégios de execução, o gerenciamento de informações sensíveis, o isolamento de rede, o controle de recursos e a validação de segurança.

A aplicação utiliza Node.js com Express e um banco de dados MySQL, executados em serviços separados por meio do Docker Compose.

## 2. Problemas identificados na configuração inicial

A análise de segurança considerou os riscos previstos no enunciado e as configurações que precisavam ser endurecidas.

| Problema analisado                                                  | Risco de segurança                                                                                | Local relacionado                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Imagem base e componentes que poderiam conter vulnerabilidades      | Componentes desatualizados ou desnecessários podem aumentar a superfície de ataque.               | `Dockerfile`                        |
| Execução da aplicação com privilégios superiores aos necessários    | Um invasor que comprometesse a aplicação poderia ter mais permissões do que o necessário.         | `Dockerfile`                        |
| Possível armazenamento de credenciais diretamente nas configurações | Senhas poderiam ser expostas por meio do código, da imagem ou do repositório.                     | Código e arquivos de configuração   |
| Exposição desnecessária de portas                                   | Serviços internos poderiam ficar acessíveis sem necessidade.                                      | `docker-compose.yml`                |
| Ausência de limites adequados de recursos                           | Um container poderia consumir recursos excessivos e prejudicar outros serviços.                   | `docker-compose.yml`                |
| Permissões excessivas e falta de restrições adicionais              | Um container comprometido poderia ter mais possibilidades de ação.                                | `Dockerfile` e `docker-compose.yml` |
| Ausência de exclusões apropriadas no contexto de build              | Arquivos locais desnecessários ou sensíveis poderiam ser incluídos no contexto enviado ao Docker. | `.dockerignore`                     |

Esses pontos foram tratados como aspectos a verificar e endurecer. A presença de cada problema na configuração original deve ser confirmada pela comparação com os arquivos anteriores ao hardening.

## 3. Medidas de hardening aplicadas

### 3.1. Imagem Docker

A imagem base foi alterada de `node:22-bookworm-slim` para `node:22-trixie-slim`, utilizando a variante slim baseada no Debian 13.

O Dockerfile também foi configurado para instalar apenas as dependências de produção, utilizar o arquivo de lock durante a instalação e executar a aplicação diretamente com Node.js.

Principais medidas:

* Utilização de uma imagem baseada em Debian com a variante slim.
* Definição de `NODE_ENV=production`.
* Instalação das dependências de produção com `npm ci --omit=dev`.
* Limpeza do cache do npm após a instalação.
* Cópia dos arquivos utilizando o usuário `node` como proprietário.
* Utilização do comando `node server.js` para iniciar a aplicação.

**Por que uma imagem menor e com menos componentes reduz a superfície de ataque?**

Uma imagem menor geralmente contém menos bibliotecas, programas e ferramentas que poderiam apresentar vulnerabilidades ou ser utilizados por um invasor. Isso reduz a quantidade de componentes que precisam ser mantidos e atualizados.

Entretanto, o tamanho da imagem, isoladamente, não garante segurança. Também é necessário utilizar componentes mantidos, corrigir vulnerabilidades e configurar corretamente os privilégios e as permissões.

### 3.2. Execução sem privilégios administrativos

A aplicação foi configurada para executar com o usuário não root `node`, por meio da instrução `USER node` no Dockerfile.

**Qual seria o impacto de um atacante obter controle de uma aplicação executada com privilégios administrativos dentro do container?**

Se a aplicação fosse comprometida enquanto executada como root, o invasor poderia realizar operações administrativas dentro do container, como modificar arquivos protegidos e alterar componentes do ambiente.

O isolamento do Docker continua sendo uma barreira importante, mas executar como root pode aumentar o impacto de uma falha, especialmente se houver outras configurações inseguras ou uma vulnerabilidade que permita escapar do container.

Ao executar como um usuário sem privilégios administrativos, reduzimos as ações que o invasor pode realizar após comprometer a aplicação.

### 3.3. Gerenciamento de informações sensíveis

As configurações necessárias para a aplicação e para o banco de dados passaram a utilizar variáveis de ambiente.

O arquivo `.env` armazena os valores utilizados no ambiente local. O `docker-compose.yml` referencia essas variáveis, evitando escrever diretamente as credenciais reais nas configurações versionadas.

O arquivo `.env.example` apresenta os nomes das variáveis necessárias, sem seus valores reais. O `.gitignore` impede que o arquivo `.env` seja adicionado ao repositório, enquanto o `.dockerignore` exclui arquivos desnecessários ou sensíveis do contexto de build.

#### 3.3.1. Por que armazenar uma senha diretamente no Dockerfile representa um risco?

As instruções do Dockerfile participam do processo de construção da imagem. Dependendo da forma como a senha é utilizada, ela pode permanecer em camadas, metadados ou histórico de construção, mesmo que seja removida em uma instrução posterior.

Assim, pessoas com acesso à imagem ou aos artefatos de build poderiam obter a credencial. A senha deve ser fornecida em tempo de execução ou por mecanismos apropriados de gerenciamento de segredos, e não gravada diretamente no Dockerfile.

#### 3.3.2. Por que o arquivo `.env` não deve ser enviado para o repositório?

O `.env` pode conter senhas, nomes de usuários e outras informações sensíveis. Ao enviá-lo ao Git, essas informações podem ficar disponíveis a outras pessoas com acesso ao repositório e continuar no histórico mesmo após a remoção do arquivo em um commit posterior.

Por isso, o `.env` deve permanecer no ambiente local e ser excluído do versionamento por meio do `.gitignore`.

#### 3.3.3. Qual é a finalidade do `.env.example`?

O `.env.example` serve como modelo para a configuração do ambiente. Ele informa quais variáveis precisam ser definidas sem revelar os valores reais.

Isso facilita a preparação do projeto por outros desenvolvedores e permite documentar as configurações necessárias com segurança.

#### 3.3.4. Qual é a diferença entre armazenar uma senha diretamente no docker-compose.yml e utilizar uma variável fornecida pelo `.env`?

Quando uma senha é escrita diretamente no `docker-compose.yml`, ela fica registrada no arquivo de configuração e pode ser exposta a qualquer pessoa que tenha acesso ao arquivo ou ao repositório.

Ao utilizar uma variável fornecida pelo `.env`, o valor fica separado da configuração versionada, facilitando sua proteção no ambiente local.

Essa abordagem melhora o gerenciamento das credenciais, mas não transforma automaticamente o `.env` em um gerenciador de segredos. As variáveis de ambiente também podem ser acessadas por usuários com permissões administrativas sobre o Docker ou sobre o processo. Em ambientes de produção, é recomendável utilizar um mecanismo apropriado de gerenciamento de segredos.

### 3.4. Segurança de rede

A aplicação publica sua porta no endereço de loopback do host, por meio do mapeamento `127.0.0.1:3000:3000`. Isso permite o acesso local sem publicar a porta da aplicação em todas as interfaces de rede do host.

O serviço MySQL não possui uma porta publicada para o host. Ele é acessado pela aplicação por meio da rede interna do Docker Compose.

A configuração também separa a comunicação entre os serviços utilizando redes distintas, incluindo uma rede de backend marcada como `internal: true`.

**Se o banco de dados é utilizado apenas pela aplicação, existe necessidade de disponibilizar sua porta diretamente para toda a máquina hospedeira?**

Não. Se apenas a aplicação precisa acessar o banco, a porta do MySQL pode permanecer acessível somente pela rede interna do Docker.

Isso reduz a exposição do banco de dados, evita conexões diretas desnecessárias pelo host e diminui a superfície de ataque. A aplicação continua conseguindo acessar o banco pela rede Docker utilizando o nome do serviço e a porta interna correspondente.

### 3.5. Controle de recursos

Foram definidos limites de utilização de CPU e memória para os serviços no `docker-compose.yml`.

**O que pode acontecer com outros serviços do host caso um container consuma continuamente toda a CPU ou memória disponível?**

O consumo excessivo pode deixar o host lento, aumentar o tempo de resposta das aplicações e impedir a execução de outros serviços. Em situações mais graves, pode ocorrer falta de memória, encerramento de processos ou indisponibilidade do sistema.

Os limites ajudam a restringir o consumo de recursos de cada serviço e reduzem o risco de que um único container prejudique todo o ambiente.

Os valores configurados devem ser dimensionados de acordo com as necessidades reais da aplicação e do banco de dados.

### 3.6. Isolamento e exposição

Além das medidas anteriores, foram aplicadas as seguintes restrições:

* `read_only: true`: impede alterações no sistema de arquivos principal do container da aplicação.
* `tmpfs` em `/tmp`: disponibiliza uma área temporária gravável, sem tornar gravável todo o sistema de arquivos.
* `noexec` e `nosuid` no volume temporário: adicionam restrições de execução e de utilização de bits de privilégios nessa área.
* `cap_drop: ALL`: remove as capabilities Linux adicionais do container da aplicação.
* `security_opt: no-new-privileges:true`: impede que processos adquiram novos privilégios por mecanismos como executáveis setuid.
* `init: true`: utiliza um processo inicial para auxiliar no gerenciamento de processos e sinais.
* Healthchecks: permitem verificar se os serviços estão respondendo conforme a verificação configurada.
* `restart: unless-stopped`: configura a política de reinicialização dos serviços.

Essas configurações reduzem as permissões e a exposição dos containers. Elas não substituem a atualização das imagens, a segurança da aplicação ou o controle de acesso ao host.

### 3.7. Segurança durante o build

O projeto possui um `.dockerignore` para excluir arquivos que não precisam ser enviados ao contexto de construção da imagem, incluindo o `.env`, quando previsto nas regras desse arquivo.

O Dockerfile copia os arquivos de dependências antes do restante do código e instala as dependências de produção usando o arquivo de lock. Essa abordagem favorece builds mais previsíveis e evita incluir dependências de desenvolvimento desnecessárias na instalação de produção.

O uso de `.dockerignore` reduz a possibilidade de enviar arquivos sensíveis ou irrelevantes ao processo de build. Ele não substitui o `.gitignore`: os dois arquivos atuam em contextos diferentes.

## 4. Análise de vulnerabilidades

Foi realizada uma análise da imagem com o Trivy, além de uma auditoria das dependências de produção da aplicação.

Após a alteração da imagem base para `node:22-trixie-slim`, o relatório do Trivy indicou:

| Componente analisado                       | Resultado                        |
| ------------------------------------------ | -------------------------------- |
| Pacotes do Debian 13.7                     | 43 ocorrências HIGH e 0 CRITICAL |
| Componentes relacionados ao Node.js/npm    | 11 ocorrências HIGH e 0 CRITICAL |
| Auditoria npm das dependências de produção | 0 vulnerabilidades reportadas    |

As ocorrências identificadas na seção Node.js incluem pacotes como `brace-expansion`, `ip-address`, `pacote`, `picomatch` e `sigstore`. Os resultados indicam a necessidade de acompanhar as atualizações dos componentes incluídos no ambiente.

Os resultados do Trivy não devem ser interpretados como uma contagem necessariamente única de vulnerabilidades entre todas as seções, pois os relatórios podem agrupar ocorrências por pacote e componente.

A auditoria npm sem vulnerabilidades reportadas é positiva para as dependências de produção da aplicação, mas não elimina os alertas identificados nos componentes do sistema operacional ou no npm incluído na imagem.

A mudança para Debian 13 reduziu as ocorrências críticas identificadas no relatório anterior, mas as vulnerabilidades altas restantes não foram todas corrigidas. Elas devem ser reavaliadas após futuras atualizações da imagem base e de seus componentes.

**Conclusão da análise:** o ambiente recebeu medidas relevantes de hardening, mas não deve ser considerado completamente livre de vulnerabilidades. O relatório residual do Trivy deve ser mantido como evidência e acompanhado em futuras revisões.

## 5. Análise final

### 5.1. Qual era o principal risco encontrado no projeto?

O principal risco considerado foi a possibilidade de uma aplicação comprometida operar com privilégios ou acessos superiores aos necessários, ampliando o impacto de uma falha.

A exposição de credenciais e de serviços internos também representa um risco importante, pois pode permitir acesso não autorizado à aplicação ou ao banco de dados.

### 5.2. Qual alteração de hardening foi mais importante? Por quê?

A execução da aplicação como usuário não root, combinada com a remoção de capabilities e com `no-new-privileges`, foi uma das medidas mais importantes.

Essas configurações reduzem os privilégios disponíveis para o processo e limitam algumas ações que poderiam ser realizadas após o comprometimento da aplicação.

Nenhuma medida isolada garante segurança. O benefício é maior quando as restrições de privilégios são combinadas com o isolamento de rede, a proteção das credenciais e a atualização dos componentes.

### 5.3. O que poderia acontecer caso o container da aplicação fosse comprometido?

Um invasor poderia tentar explorar vulnerabilidades da aplicação, acessar dados disponíveis ao processo, utilizar as credenciais acessíveis ou interferir no funcionamento do serviço.

O impacto dependeria das permissões, dos dados acessíveis, das falhas exploradas e da configuração do ambiente. O hardening reduz as possibilidades de ação, mas não impede todos os tipos de ataque.

### 5.4. Como o princípio do menor privilégio foi aplicado?

O princípio foi aplicado executando a aplicação como usuário não root, removendo capabilities desnecessárias, impedindo a obtenção de novos privilégios, tornando o sistema de arquivos principal somente leitura e limitando o acesso à rede e aos recursos do host.

O banco de dados também deixou de ter sua porta publicada diretamente no host, permanecendo acessível pela rede Docker necessária à aplicação.

### 5.5. Por que o `.env` não deve ser enviado para o repositório?

Porque pode conter credenciais e outras informações sensíveis. Se enviado ao repositório, esses valores podem ser acessados por terceiros autorizados a ler o projeto ou permanecer no histórico do Git.

O `.gitignore` ajuda a impedir o versionamento acidental do arquivo, enquanto o `.env.example` permite documentar as variáveis necessárias sem expor seus valores.

### 5.6. Qual é a função do `.env.example`?

O `.env.example` apresenta os nomes das variáveis necessárias para configurar e executar o projeto, sem incluir credenciais reais. Ele serve como referência para a criação do `.env` em outros ambientes.

### 5.7. Como o projeto poderia receber novas verificações de segurança automaticamente em uma pipeline CI/CD?

Uma pipeline CI/CD poderia executar verificações automaticamente a cada push ou pull request. Entre as medidas recomendadas estão:

1. Executar testes automatizados da aplicação.
2. Executar `npm audit --omit=dev` para verificar as dependências de produção.
3. Utilizar o Trivy para analisar a imagem Docker e identificar vulnerabilidades conhecidas.
4. Verificar configurações do Dockerfile e do Docker Compose com ferramentas de análise estática.
5. Bloquear ou exigir aprovação para alterações que ultrapassem limites de vulnerabilidade definidos pela equipe.
6. Publicar a imagem somente após as verificações obrigatórias e utilizar tags de versão rastreáveis.

Essa automação ajuda a detectar problemas antes da implantação. Os critérios de bloqueio devem considerar a gravidade, a disponibilidade de correções e o risco efetivo de cada vulnerabilidade.

### 5.8. Quais medidas adicionais poderiam ser aplicadas caso essa aplicação fosse executada em Kubernetes?

Em Kubernetes, poderiam ser adotadas medidas adicionais, como:

* Definir `runAsNonRoot` e um `runAsUser` apropriado no contexto de segurança do Pod.
* Configurar `allowPrivilegeEscalation: false` e remover capabilities desnecessárias.
* Utilizar `readOnlyRootFilesystem: true` quando compatível com a aplicação.
* Definir `resources.requests` e `resources.limits` para CPU e memória.
* Aplicar NetworkPolicies para controlar a comunicação entre Pods.
* Utilizar Secrets do Kubernetes ou uma integração com um gerenciador externo de segredos, com permissões de acesso restritas.
* Configurar RBAC para conceder somente as permissões necessárias a usuários e contas de serviço.
* Aplicar Pod Security Standards, preferencialmente com o nível `restricted` quando compatível.
* Utilizar análise de vulnerabilidades, assinatura de imagens e políticas de admissão.
* Monitorar logs, eventos e alertas de segurança do cluster.

Essas medidas reforçam o isolamento, o controle de acesso e a observabilidade em um ambiente orquestrado.

## 6. Evidências de validação

Após as alterações, os containers foram verificados com `docker compose ps`. Os serviços da aplicação e do banco de dados apresentaram estado `healthy`.

O endpoint `/health` retornou:

```json
{
  "status": "ok"
}
```

O endpoint `/db-check` retornou:

```json
{
  "status": "ok",
  "banco": "conectado",
  "teste": 1
}
```

Esses resultados confirmam que a aplicação respondeu ao teste de saúde e conseguiu realizar a verificação de conexão com o banco de dados.

Também foi verificada a configuração de segurança do container da aplicação com `docker inspect`, confirmando:

* Usuário de execução: `node`.
* Sistema de arquivos somente leitura: habilitado.
* Capabilities adicionais: removidas (`CapDrop: ALL`).
* `no-new-privileges`: habilitado.

O `.env` foi configurado para ser ignorado pelo Git, e o `.env.example` foi preparado para ser versionado sem os valores reais das credenciais.

A análise do Trivy e a auditoria npm foram utilizadas para avaliar as vulnerabilidades conhecidas dos componentes. As vulnerabilidades residuais identificadas foram registradas, sem afirmar que o ambiente está completamente livre de riscos.

## 7. Conclusão

A atividade permitiu aplicar práticas importantes de segurança em containers Docker, incluindo redução de privilégios, restrição de acesso à rede, controle de recursos, proteção das credenciais e redução de componentes desnecessários.

A aplicação continuou funcional após as mudanças, com os endpoints de saúde e de verificação do banco de dados respondendo corretamente.

Os resultados da análise de vulnerabilidades demonstram melhoria na imagem utilizada, embora ainda existam alertas que precisam ser acompanhados. O hardening é um processo contínuo, que exige atualizações, novas verificações e revisão das configurações conforme a aplicação evolui.
