import { generateProjectectectectectectectactionsnsnsnsnsnactionsionsionsionsionsionsionsionsionsionsionsionsionsions";
import { projectQueueserserserserserserservicesuquququququeue

export async function ProjectGenerator() {
  // Get a pre-generated project from the queue
  const project = await projectQueue.getNextProject();

  return {
    name: project.name,
    url: project.publicUrl,
  };
}
