pipeline {
    agent any

    options {
        gitLabConnection('iperity-gitlab')
    }

    stages {
        stage('Build Docker image') {
            steps {
                sh './dockerize true'
            }
        }
        stage('Install npm dependencies') {
            steps {
                sh './dockerize npm ci'
            }
        }
        stage('Build') {
            steps {
                sh './dockerize npm run build-ci'
            }
        }
        stage('Test') {
            steps {
                sh './dockerize npm test'
            }
        }
    }

    post {

        success {
            updateGitlabCommitStatus name: 'build', state: 'success'
        }

        failure {
            updateGitlabCommitStatus name: 'build', state: 'failed'

            emailext (
                recipientProviders: [developers()],
                attachLog: true,
                subject: '${DEFAULT_SUBJECT}',
                body: '${DEFAULT_CONTENT}'
            )
        }
    }
}