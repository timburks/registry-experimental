const express = require('express')
const fs = require("fs");
const handlebars = require("handlebars");
const { RegistryClient } = require("@giteshk-org/apigeeregistry");
const grpc = require("@grpc/grpc-js");

var client_options = {};
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    client_options.sslCreds = grpc.credentials.createInsecure();
}

if (process.env.APG_REGISTRY_ADDRESS) {
    items = process.env.APG_REGISTRY_ADDRESS.split(":");
    client_options.apiEndpoint = items[0];
    client_options.port = items.length >= 1 ? items[1] : 443;
}

const client = new RegistryClient(client_options);

const swagger_ui_template = fs.readFileSync("renderers/swagger-ui.html.template");
const graphiql_template = fs.readFileSync("renderers/graphiql.html.template");
const async_template = fs.readFileSync("renderers/async-ui.html.template");

const app = express();

app.use('/renderer/openapi', express.static(require('swagger-ui-dist').absolutePath()))

app.use('/renderer/async', express.static('node_modules/@webcomponents/webcomponentsjs'))
app.use('/renderer/async', express.static('node_modules/@asyncapi/web-component'))
 app.use('/renderer/async', express.static('node_modules/@asyncapi/react-component'))

app.use('/renderer/graphql', express.static('node_modules/react'))
app.use('/renderer/graphql', express.static('node_modules/react-dom'))
app.use('/renderer/graphql', express.static('node_modules/graphiql'))

app.get('/renderer/:apiformat/projects/:projectId/locations/:locationId/apis/:apiId/versions/:versionId/specs/:specId', (req, res) => {
    res.setHeader("content-type", "text/html; charset=UTF-8");
    spec_url = "/spec/projects/" + req.params.projectId + "/locations/" + req.params.locationId + "/apis/" + req.params.apiId + "/versions/" + req.params.versionId + "/specs/" + req.params.specId;
    renderer_template = "";
    switch (req.params.apiformat) {
        case "openapi":
            renderer_template = swagger_ui_template.toString();
            break;
        case "async":
            renderer_template = async_template.toString();
            break;
        case "graphql":
            renderer_template = graphiql_template.toString();
            break;
    }
    hbstemplate = handlebars.compile(renderer_template);
    res.send(hbstemplate({ specUrl: spec_url }));
    res.end();
});

app.all("/spec/projects/:projectId/locations/:locationId/apis/:apiId/versions/:versionId/specs/:specId", (req, res) => {
    if (req.method !== 'POST' && req.method !== 'GET') {
        res.sendStatus(404);
        res.end();
        return;
    }

    let spec_url = "projects/" + req.params.projectId + "/locations/" + req.params.locationId + "/apis/" + req.params.apiId + "/versions/" + req.params.versionId + "/specs/" + req.params.specId;

    client.getApiSpecContents(
        {
            name: spec_url
        }, (err, response) => {
            if (err) {
                console.error(err);
                res.sendStatus(500);
                res.end();
            } else {
                res.setHeader("content-type", response.contentType);
                res.send(response.data);
                res.end();
            }
        })
});

app.get('/healthz', (req, res) =>{
    res.sendStatus(200);
    res.end();
});
app.listen(process.env.PORT || 3000);