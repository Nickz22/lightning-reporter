Http http = new Http();
HttpRequest req = new HttpRequest();
req.setEndpoint('callout:Usage_Metric_Endpoint/services/apexrest/Reporter/lightningreporter/usage');
req.setMethod('POST');
req.setHeader('Content-Type','application/json');
PushUsageMetricsBatch.UsagePayload payload = new PushUsageMetricsBatch.UsagePayload(
    Database.query('SELECT Action__c,Object__c,CreatedBy.Name,CreatedById,User_Profile__c FROM Usage_Metric__c'), 
    new PermissionSetAssignmentSelector().selectLightningReporterUsers().size()
);
System.debug(JSON.serializePretty(payload));
req.setBody(JSON.serialize(new Map<String, String>{'payload' => JSON.serialize(payload)}));
// send HTTP call
HttpResponse res = http.send(req);
System.debug('endpoint: ' + req.getEndpoint());
// process response
if(res.getStatusCode() == 201 || res.getStatusCode() == 200){
    System.debug('SUCCESS');
} else {
    System.debug('FAILURE [' + res.getStatusCode() + ']: ' + res.getBody());
}