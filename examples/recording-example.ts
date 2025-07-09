/**
 * Example demonstrating how to handle recording notifications in Compass.js
 */

import { Connection, Recording, Event, EventType } from "../src/Compass";

// Example usage of the recording functionality
function setupRecordingHandling(connection: Connection) {
    // Subscribe to recording events
    connection.model.recordingsObservable.subscribe((event: Event) => {
        const recording = event.emitter as Recording;

        switch (event.eventType) {
            case EventType.Added:
                console.log("New recording created:", {
                    id: recording.id,
                    callId: recording.callId,
                    identityId: recording.identityId,
                    duration: recording.duration,
                    startTime: recording.startTime,
                    endTime: recording.endTime,
                    inbound: recording.inbound,
                    callerId: recording.callerId,
                    calleeId: recording.calleeId,
                });

                // Example: Process the recording
                processRecording(recording);
                break;


            // Removed and Changed events are not yet supported, and are not expected to be received at this time
            case EventType.Removed:
                console.log("Recording removed:", recording.id);
                break;

            case EventType.Changed:
                console.log("Recording updated:", recording.id);
                break;
        }
    });
}

function processRecording(recording: Recording) {
    // Example processing logic
    console.log(
        `Processing recording ${recording.id} for call ${recording.callId}`
    );

    // You can access all recording properties:
    if (recording.identityId) {
        console.log(`Recording belongs to identity: ${recording.identityId}`);

        // Example: Send notification to user about new recording
        notifyUserAboutRecording(recording);
    }

    // Example: Store recording metadata
    storeRecordingMetadata(recording);
}

function notifyUserAboutRecording(recording: Recording) {
    // Example notification logic
    console.log(`Notifying user about recording ${recording.id}`);
    console.log(`Call duration: ${recording.duration} seconds`);
    console.log(`Call was ${recording.inbound ? "inbound" : "outbound"}`);
}

function storeRecordingMetadata(recording: Recording) {
    // Example storage logic
    const metadata = {
        recordingId: recording.id,
        callId: recording.callId,
        identityId: recording.identityId,
        startTime: recording.startTime,
        endTime: recording.endTime,
        duration: recording.duration,
        callerId: recording.callerId,
        calleeId: recording.calleeId,
        inbound: recording.inbound,
        timestamp: new Date().toISOString(),
    };

    console.log("Storing recording metadata:", metadata);
    // Here you would typically save to a database or send to an API
}

// Example: Get all recordings for a specific call
function getRecordingsForCall(
    connection: Connection,
    callId: string
): Recording[] {
    return Object.values(connection.model.recordings).filter(
        (recording) => recording.callId === callId
    );
}

// Example: Get all recordings for a specific identity
function getRecordingsForIdentity(
    connection: Connection,
    identityId: number
): Recording[] {
    return Object.values(connection.model.recordings).filter(
        (recording) => recording.identityId === identityId
    );
}

// Example: Get recordings within a time range
function getRecordingsInTimeRange(
    connection: Connection,
    startTime: string,
    endTime: string
): Recording[] {
    return Object.values(connection.model.recordings).filter((recording) => {
        const rangeStart = new Date(startTime);
        const rangeEnd = new Date(endTime);

        return recording.startTime >= rangeStart && recording.startTime <= rangeEnd;
    });
}

export {
    setupRecordingHandling,
    processRecording,
    getRecordingsForCall,
    getRecordingsForIdentity,
    getRecordingsInTimeRange,
};
