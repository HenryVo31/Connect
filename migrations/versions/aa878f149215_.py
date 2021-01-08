"""empty message

Revision ID: aa878f149215
Revises: cc192498465f
Create Date: 2020-08-31 16:26:23.293118

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'aa878f149215'
down_revision = 'cc192498465f'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('chat', sa.Column('image', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('chat', 'image')
    # ### end Alembic commands ###