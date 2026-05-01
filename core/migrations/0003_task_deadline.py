from django.db import migrations, models


def copy_due_date_to_deadline(apps, schema_editor):
    Task = apps.get_model("core", "Task")
    for task in Task.objects.all():
        task.deadline = task.due_date
        task.save(update_fields=["deadline"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_user_student_profile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="deadline",
            field=models.DateTimeField(null=True),
        ),
        migrations.RunPython(copy_due_date_to_deadline,
                             migrations.RunPython.noop),
        migrations.AlterField(
            model_name="task",
            name="deadline",
            field=models.DateTimeField(),
        ),
    ]
