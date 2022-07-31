List <Apexlog> loglist = [Select Id from Apexlog limit 100];
for(Apexlog al: loglist){
    Http h = new Http();
    HttpRequest req = new HttpRequest();
    req.setEndpoint(Url.getOrgDomainUrl().toExternalForm()
    + '/services/data/v44.0/sobjects/Apexlog/'+al.Id);
    req.setMethod('DELETE');
    req.setHeader('Authorization', 'Bearer ' + UserInfo.getSessionId());
    HttpResponse res = h.send(req);
    System.debug(res.getStatusCode());
}

System.debug('loglist'+loglist);