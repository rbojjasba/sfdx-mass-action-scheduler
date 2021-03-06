/**
 * Author: Doug Ayers
 * Website: https://douglascayers.com
 * GitHub: https://github.com/douglascayers/sfdx-mass-action-scheduler
 * License: BSD 3-Clause License
 */
public with sharing class MA_IterableSourceBatchable implements Database.Batchable<Map<String, Object>>, Database.Stateful, Database.AllowsCallouts, Database.RaisesPlatformEvents {

    private ID configId { get; set; }

    private Mass_Action_Configuration__c config { get; set; }

    private Iterable<Map<String, Object>> iterable { get; set; }

    public MA_IterableSourceBatchable( ID configId, Iterable<Map<String, Object>> iterable ) {
        this.configId = configId;
        this.iterable = iterable;
    }

    // ------------------------------------------------------------------------

    public Iterable<Map<String, Object>> start( Database.BatchableContext context ) {

        System.debug( 'MA_IterableSourceBatchable.start: ' + context + ', configId=' + this.configId );

        this.config = MA_MassActionUtils.getConfiguration( this.configId );

        return this.iterable;
    }

    public void execute( Database.BatchableContext context, List<Map<String, Object>> sourceRowMaps ) {

        System.debug( 'MA_IterableSourceBatchable.execute: ' + context + ', configId=' + this.configId );

        try {

            List<Map<String, Object>> targetRowMaps = MA_MassActionUtils.buildActionInputs( sourceRowMaps, this.config.Mass_Action_Mappings__r );

            MA_MassActionUtils.invokeAction( MA_MassActionUtils.getCalloutRestEndpointURL( this.config.Named_Credential__c ), this.config, targetRowMaps );

        } catch ( Exception e ) {

            System.debug( LoggingLevel.ERROR, e.getMessage() + ' : ' + e.getStackTraceString() );

            MA_MassActionBatchUtils.logJobException( this.configId, context.getJobId(), e );

        }

    }

    public void finish( Database.BatchableContext context ) {

        System.debug( 'MA_IterableSourceBatchable.finish: ' + context + ', configId=' + this.configId );

        MA_MassActionBatchUtils.handleBatchJobFinished( this.configId, context.getJobId() );

    }

    // ------------------------------------------------------------------------

}
/*
BSD 3-Clause License

Copyright (c) 2018, Doug Ayers, douglascayers.com
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/