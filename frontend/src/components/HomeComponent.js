import React from 'react';

function HomeComponent() {
  return (
    <div className="home-container">
      <h1>Welcome to AFWI MAGE FineTune</h1>
      
      <section>
        <h2>What is Fine-Tuning?</h2>
        <p>
          Fine-tuning is a process of adapting a pre-trained language model to a specific task or domain. 
          It involves taking a model that has been trained on a large corpus of text and further training 
          it on a smaller, task-specific dataset. This process allows the model to learn the nuances and 
          specifics of your particular use case, resulting in improved performance for your specific needs.
        </p>
      </section>

      <section>
        <h2>How Fine-Tuning Works</h2>
        <ol>
          <li><strong>Pre-trained Model:</strong> We start with a model that has been trained on a large, general dataset.</li>
          <li><strong>Custom Dataset:</strong> You provide a dataset specific to your task or domain.</li>
          <li><strong>Training:</strong> The model is then trained on your custom dataset, adjusting its parameters to better fit your specific use case.</li>
          <li><strong>Evaluation:</strong> The fine-tuned model is evaluated to ensure it performs well on your specific task.</li>
        </ol>
      </section>

      <section>
        <h2>How This Application Works</h2>
        <p>AFWI MAGE FineTune simplifies the fine-tuning process with the following steps:</p>
        <ol>
          <li><strong>Upload Documents:</strong> You can upload PDF, DOCX, or TXT files containing your domain-specific text.</li>
          <li><strong>Extract Content:</strong> Our application extracts relevant content from your documents.</li>
          <li><strong>Review and Edit:</strong> You can review and edit the extracted content to ensure quality.</li>
          <li><strong>Fine-Tune:</strong> Select a base model and start the fine-tuning process with your prepared dataset.</li>
          <li><strong>Interact:</strong> Once fine-tuning is complete, you can interact with your custom model through a chat interface.</li>
        </ol>
      </section>

      <section>
        <h2>Benefits of Using AFWI MAGE FineTune</h2>
        <ul>
          <li>Simplified process for non-technical users</li>
          <li>Fully offline operation for secure environments</li>
          <li>Customizable models tailored to your specific needs</li>
          <li>Improved performance on domain-specific tasks</li>
        </ul>
      </section>

      <p>
        Get started by navigating to the Upload section and uploading your first document!
      </p>
    </div>
  );
}

export default HomeComponent;