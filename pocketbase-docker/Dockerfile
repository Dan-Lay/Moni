FROM alpine:3.19

ARG PB_VERSION=0.26.8

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

RUN wget -O /tmp/pocketbase.zip \
    "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && unzip /tmp/pocketbase.zip pocketbase -d /app/ \
    && chmod +x /app/pocketbase \
    && rm /tmp/pocketbase.zip

RUN apk del wget unzip

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8090

ENTRYPOINT ["/app/entrypoint.sh"]
