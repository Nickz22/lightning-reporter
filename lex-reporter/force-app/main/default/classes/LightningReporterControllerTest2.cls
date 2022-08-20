@isTest
public class LightningReporterControllerTest2 {
    
    @TestSetup
    static void makeData(){
        insert new LEX_Reporter_Table_Configuration__c(
            Default_Fieldset__c = 'Id,Name'
        );
    }

    @isTest
    static void givenDefaultTableConfiguration_verifyDefaultDTOs(){
        String defaultFields = [SELECT Default_Fieldset__C FROM LEX_Reporter_Table_Configuration__c LIMIT 1][0].Default_Fieldset__c;
        String objectType = 'Contact';

        // invoke LightningReporterController.getFieldsFromType()
        List<LightningReporterController.FieldDTO> dtos = LightningReporterController.getFieldsFromType(objectType);

        Integer numAssertions = 0;
        for(LightningReporterController.FieldDTO dto : dtos){            
            if(defaultFields.containsIgnoreCase(dto.name)){
                // System.assert(/** assert that default fieldset contains this default selected field */); 
                numAssertions++;
            }
        }

        // assert num assertions equals number of default fields (2)
    }
}
