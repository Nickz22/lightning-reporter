@isTest
public with sharing class LightningReporterControllerTest {

    @isTest
    static void verifyGetFieldsFromType(){
        // given a Contact type
        String sObjectType = 'Contact';

        // when getFieldsFromType is called
        List<LightningReporterController.FieldDTO> fields = LightningReporterController.getFieldsFromType(sObjectType);

        // then all fields in the Contact schema are returned
        System.assertEquals(contact.SObjectType.getDescribe().fields.getMap().size(), fields.size());
    }

}
