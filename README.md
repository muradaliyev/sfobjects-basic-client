# sfobjects-to-typescript

sfobjects-to-typescript is an NPM package that pulls Salesforce objects description and saves as Typescript interfaces.

## Installation

```bash
npm sfobjects-to-typescript
```

## Command-line Usage

```bash
npx sfobjects-to-typescript --username username --password password --output output_folder --objects Object1__c Object2__c
```

```
Options:
      --version               Show version number                      [boolean]
  -u, --username              Salesforce username            [string] [required]
  -p, --password              Salesforce password            [string] [required]
      --objects, --obj        List of objects to generate types for
                                                              [array] [required]
      --login_url, --lurl     Salesforce login URL e.g.
                              https://login.salesforce.com/             [string]
      --server_url, --surl    Salesforce SOAP service endpoint URL e.g.
                              https://na1.salesforce.com/services/Soap/u/28.0
                                                                        [string]
      --instance_url, --iurl  Salesforce instance URL e.g.
                              https://na1.salesforce.com/               [string]
  -c, --client_id             Salesforce client id                      [string]
  -s, --client_secret         Salesforce client secret                  [string]
  -t, --token                 Salesforce api token                      [string]
      --access_token, --at    Salesforce OAuth2 access token            [string]
  -o, --path                  The output folder, default is stdout      [string]
      --help                  Show help                                [boolean]
```


## Usage

```typescript
import { exctract } from sfobjects-to-typescript

await extract({        
    username: 'myuser',
    password: 'mypassword',    
    objects: ['Object1__c','Object2__c']
});

```

## Contributing

--

## License

[MIT](https://choosealicense.com/licenses/mit/)