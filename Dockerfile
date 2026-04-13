# syntax=docker/dockerfile:1.7

ARG UBUNTU_VERSION=24.04
FROM --platform=linux/amd64 ubuntu:${UBUNTU_VERSION}

ARG DEBIAN_FRONTEND=noninteractive
ARG VSCODE_CLI_VERSION=1.109.3
ARG PYTHON_VERSION=3.14.3
ARG UV_VERSION=0.9.21
ARG NODE_VERSION=25.6.0
ARG NPM_VERSION=11.8.0
ARG CODEX_NPM_VERSION=latest
ARG RUST_VERSION=1.93.1
ARG VULKAN_SDK_VERSION=1.4.341.1
ARG USERNAME=dev
ARG USER_UID=1000
ARG USER_GID=1000
ARG NGROK_VERSION=3.30.0
ARG DEVTUNNEL_DOWNLOAD_URL=https://aka.ms/TunnelsCliDownload/linux-x64

ENV TZ=Asia/Tokyo
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV HOME=/home/${USERNAME}
ENV CARGO_HOME=/home/${USERNAME}/.cargo
ENV RUSTUP_HOME=/home/${USERNAME}/.rustup
ENV NPM_CONFIG_PREFIX=/home/${USERNAME}/.npm-global
ENV CODEX_NPM_PACKAGE=@openai/codex
ENV VULKAN_SDK=/opt/vulkansdk/${VULKAN_SDK_VERSION}/x86_64
ENV VK_LAYER_PATH=/opt/vulkansdk/${VULKAN_SDK_VERSION}/x86_64/share/vulkan/explicit_layer.d:/usr/share/vulkan/explicit_layer.d
ENV PATH=/workspace/scripts:/opt/vscode-cli:/opt/uv:/opt/node/bin:/home/${USERNAME}/.cargo/bin:/opt/python/${PYTHON_VERSION}/bin:/home/${USERNAME}/.npm-global/bin:${PATH}

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg; \
    install -m 0755 -d /etc/apt/keyrings; \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc; \
    chmod a+r /etc/apt/keyrings/docker.asc; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo ${UBUNTU_CODENAME:-$VERSION_CODENAME}) stable" \
    > /etc/apt/sources.list.d/docker.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
    wget \
    git \
    gh \
    bubblewrap \
    netcat-openbsd \
    ncat \
    xz-utils \
    zip \
    unzip \
    xvfb \
    fonts-noto-color-emoji \
    fonts-unifont \
    xfonts-cyrillic \
    xfonts-scalable \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-tlwg-loma-otf \
    fonts-freefont-ttf \
    build-essential \
    pkg-config \
    cmake \
    ninja-build \
    jq \
    docker-buildx-plugin \
    docker-ce-cli \
    docker-compose-plugin \
    libssl-dev \
    libffi-dev \
    zlib1g-dev \
    libbz2-dev \
    libreadline-dev \
    libsqlite3-dev \
    liblzma-dev \
    tk-dev \
    llvm \
    libncursesw5-dev \
    libgdbm-dev \
    libnss3-dev \
    libxml2-dev \
    libxmlsec1-dev \
    libglib2.0-0t64 \
    libatk-bridge2.0-0t64 \
    libatk1.0-0t64 \
    libatspi2.0-0t64 \
    libcairo2 \
    libcups2t64 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libfontconfig1 \
    libfreetype6 \
    libwayland-dev \
    wayland-protocols \
    libxkbcommon-dev \
    libx11-dev \
    libxrandr-dev \
    libxi-dev \
    libasound2-dev \
    libudev-dev \
    libvulkan1 \
    vulkan-tools \
    vulkan-validationlayers \
    mesa-vulkan-drivers; \
    rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    curl -fsSL https://apt.llvm.org/llvm-snapshot.gpg.key | gpg --dearmor -o /usr/share/keyrings/llvm-archive-keyring.gpg; \
    echo "deb [signed-by=/usr/share/keyrings/llvm-archive-keyring.gpg] https://apt.llvm.org/noble/ llvm-toolchain-noble-21 main" > /etc/apt/sources.list.d/llvm.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends lldb-21; \
    ln -sfn /usr/bin/lldb-21 /usr/local/bin/lldb; \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/vscode-cli \
    && curl -fsSL "https://update.code.visualstudio.com/${VSCODE_CLI_VERSION}/cli-linux-x64/stable" -o /tmp/vscode-cli.tar.gz \
    && tar -xzf /tmp/vscode-cli.tar.gz -C /opt/vscode-cli \
    && ln -sf /opt/vscode-cli/code /usr/local/bin/code \
    && rm -f /tmp/vscode-cli.tar.gz

RUN mkdir -p /opt/uv \
    && curl -fsSL "https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-x86_64-unknown-linux-gnu.tar.gz" -o /tmp/uv.tar.gz \
    && tar -xzf /tmp/uv.tar.gz -C /tmp \
    && cp /tmp/uv-x86_64-unknown-linux-gnu/uv /opt/uv/uv \
    && cp /tmp/uv-x86_64-unknown-linux-gnu/uvx /opt/uv/uvx \
    && chmod +x /opt/uv/uv /opt/uv/uvx \
    && ln -sf /opt/uv/uv /usr/local/bin/uv \
    && ln -sf /opt/uv/uvx /usr/local/bin/uvx \
    && rm -rf /tmp/uv.tar.gz /tmp/uv-x86_64-unknown-linux-gnu

RUN cd /tmp \
    && curl -fsSLO "https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tgz" \
    && tar -xzf "Python-${PYTHON_VERSION}.tgz" \
    && cd "Python-${PYTHON_VERSION}" \
    && ./configure --prefix="/opt/python/${PYTHON_VERSION}" --with-ensurepip=install \
    && make -j"$(nproc)" \
    && make install \
    && ln -sf "/opt/python/${PYTHON_VERSION}/bin/python3" /usr/local/bin/python \
    && ln -sf "/opt/python/${PYTHON_VERSION}/bin/pip3" /usr/local/bin/pip \
    && rm -rf "/tmp/Python-${PYTHON_VERSION}" "/tmp/Python-${PYTHON_VERSION}.tgz"

RUN mkdir -p /opt/node \
    && curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    && tar -xJf "node-v${NODE_VERSION}-linux-x64.tar.xz" -C /opt/node --strip-components=1 \
    && ln -sf /opt/node/bin/node /usr/local/bin/node \
    && ln -sf /opt/node/bin/npm /usr/local/bin/npm \
    && ln -sf /opt/node/bin/npx /usr/local/bin/npx \
    && npm install -g "npm@${NPM_VERSION}" \
    && rm -f "node-v${NODE_VERSION}-linux-x64.tar.xz"

RUN curl -fsSL "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v${NGROK_VERSION}-linux-amd64.tgz" -o /tmp/ngrok.tgz \
    && tar -xzf /tmp/ngrok.tgz -C /usr/local/bin ngrok \
    && chmod +x /usr/local/bin/ngrok \
    && rm -f /tmp/ngrok.tgz

# Keep devtunnel installed until #154 migrates the launcher off the legacy path.
RUN curl -fsSL "${DEVTUNNEL_DOWNLOAD_URL}" -o /usr/local/bin/devtunnel \
    && chmod +x /usr/local/bin/devtunnel

RUN mkdir -p /opt/vulkansdk \
    && curl -fsSL "https://sdk.lunarg.com/sdk/download/${VULKAN_SDK_VERSION}/linux/vulkansdk-linux-x86_64-${VULKAN_SDK_VERSION}.tar.xz?Human=true" -o /tmp/vulkansdk.tar.xz \
    && tar -xJf /tmp/vulkansdk.tar.xz -C /opt/vulkansdk \
    && ln -sf "/opt/vulkansdk/${VULKAN_SDK_VERSION}/x86_64/bin/vulkaninfo" /usr/local/bin/vulkaninfo \
    && rm -f /tmp/vulkansdk.tar.xz

RUN if ! getent group "${USER_GID}" >/dev/null; then \
    groupadd --gid "${USER_GID}" "${USERNAME}"; \
    fi \
    && if id -u "${USERNAME}" >/dev/null 2>&1; then \
    usermod --uid "${USER_UID}" --gid "${USER_GID}" "${USERNAME}"; \
    elif getent passwd "${USER_UID}" >/dev/null; then \
    EXISTING_USER="$(getent passwd "${USER_UID}" | cut -d: -f1)"; \
    usermod --login "${USERNAME}" --home "${HOME}" --move-home "${EXISTING_USER}"; \
    usermod --uid "${USER_UID}" --gid "${USER_GID}" "${USERNAME}"; \
    else \
    useradd --uid "${USER_UID}" --gid "${USER_GID}" --create-home --shell /bin/bash "${USERNAME}"; \
    fi \
    && mkdir -p /workspace "${HOME}" "${CARGO_HOME}" "${RUSTUP_HOME}" "${NPM_CONFIG_PREFIX}" "${HOME}/.cache" "${HOME}/.codex" "${HOME}/.config/gh" "${HOME}/.vscode-cli" \
    && touch "${HOME}/.codex/.keep" "${HOME}/.config/gh/.keep" "${HOME}/.vscode-cli/.keep" \
    && chown -R "${USERNAME}:${USER_GID}" \
    /workspace \
    "${HOME}"

RUN curl -fsSL "https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu/rustup-init" -o /tmp/rustup-init \
    && chmod +x /tmp/rustup-init \
    && chown "${USERNAME}:${USER_GID}" /tmp/rustup-init \
    && su - "${USERNAME}" -c "CARGO_HOME='${CARGO_HOME}' RUSTUP_HOME='${RUSTUP_HOME}' /tmp/rustup-init -y --profile minimal --default-toolchain '${RUST_VERSION}'" \
    && su - "${USERNAME}" -c "CARGO_HOME='${CARGO_HOME}' RUSTUP_HOME='${RUSTUP_HOME}' ${CARGO_HOME}/bin/rustup component add rustfmt clippy" \
    && rm -f /tmp/rustup-init

RUN su - "${USERNAME}" -c "NPM_CONFIG_PREFIX='${NPM_CONFIG_PREFIX}' /opt/node/bin/npm config set prefix '${NPM_CONFIG_PREFIX}'" \
    && su - "${USERNAME}" -c "NPM_CONFIG_PREFIX='${NPM_CONFIG_PREFIX}' /opt/node/bin/npm install -g '@openai/codex@${CODEX_NPM_VERSION}'"

USER ${USERNAME}
WORKDIR /workspace

CMD ["bash", "-lc", "if [ \"${CODEX_AUTO_UPDATE:-true}\" = \"true\" ]; then if npm install -g \"${CODEX_NPM_PACKAGE}@${CODEX_NPM_VERSION:-latest}\"; then echo \"Codex CLI update completed\"; else echo \"WARNING: failed to update Codex CLI; continuing with the installed version\" >&2; fi; fi; exec sleep infinity"]
