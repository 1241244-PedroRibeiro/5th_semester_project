FROM swipl:stable
WORKDIR /app
COPY *.pl ./
EXPOSE 8080
CMD ["swipl", "-q", "-s", "server.pl"]