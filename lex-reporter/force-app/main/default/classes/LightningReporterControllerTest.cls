@isTest
public with sharing class LightningReporterControllerTest {

    @isTest
    static void verifyGetFieldsFromType(){
        List<LightningReporterController.FieldDTO> fields = LightningReporterController.getFieldsFromType('Contact');
        for(String apiName : contact.sobjecttype.getDescribe().fields.getMap().keySet()){  
            System.debug('printing field name: '+apiName);
            System.debug('printing field name from token: '+contact.sobjecttype.getDescribe().fields.getMap().get(apiName).getDescribe().getType());            
        }
            System.assertEquals(contact.SObjectType.getDescribe().fields.getMap().size(), fields.size());
            
    }

}
