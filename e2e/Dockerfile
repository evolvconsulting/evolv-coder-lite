FROM node:24-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash jq git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash tester
USER tester
WORKDIR /home/tester

COPY --chown=tester:tester evolvconsulting-evolv-coder-lite-*.tgz /home/tester/
COPY --chown=tester:tester e2e/scripts/ /home/tester/scripts/
COPY --chown=tester:tester e2e/tests/ /home/tester/tests/

RUN chmod +x /home/tester/scripts/*.sh /home/tester/tests/*.sh

ENTRYPOINT ["/home/tester/scripts/entrypoint.sh"]
