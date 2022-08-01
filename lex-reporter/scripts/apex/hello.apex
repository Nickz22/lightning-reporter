// List <Apexlog> loglist = [Select Id from Apexlog limit 100];
// for(Apexlog al: loglist){
//     Http h = new Http();
//     HttpRequest req = new HttpRequest();
//     req.setEndpoint(Url.getOrgDomainUrl().toExternalForm()
//     + '/services/data/v44.0/sobjects/Apexlog/'+al.Id);
//     req.setMethod('DELETE');
//     req.setHeader('Authorization', 'Bearer ' + UserInfo.getSessionId());
//     HttpResponse res = h.send(req);
//     System.debug(res.getStatusCode());
// }

// System.debug('loglist'+loglist);

// LightningReporterController.getFieldsFromType('Contact');

List<Contact> contacts = new List<Contact>();
for(Integer i = 0; i<10; i++){
    contacts.add(
        new Contact(
            AccountId='0015400000r6V1UAAU',
            LastName='test_lastname',
            FirstName='test_firstname'+i
        )
    );
}

insert contacts;